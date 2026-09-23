import type {
  AdapterFetchOptions,
  AdapterFetchResult,
  IngestJobDraft,
  JobSourceAdapter,
} from "../types";
import { stripHtml } from "@/lib/jobs/sync-normalize";
import { fetchWithRetry } from "../http";
import { normalizeJobUrl } from "../url";
import { tryAcquireSourceQuota } from "../rate-limit";

/**
 * Himalayas public remote-jobs API.
 *
 * Documentation: https://himalayas.app/jobs/api
 *
 * Response shape (public, at time of writing):
 *   {
 *     "jobs": [
 *       {
 *         "title": "...",
 *         "companyName": "...",
 *         "locationRestrictions": ["Worldwide"],
 *         "pubDate": 1700000000,
 *         "guid": "https://himalayas.app/companies/x/jobs/y-1234567890",
 *         "applicationLink": "https://...",
 *         "description": "<p>...</p>",
 *         "jobType": "Full Time",
 *         "categories": ["Engineering"]
 *       }
 *     ],
 *     "offset": 0,
 *     "limit": 100,
 *     "totalCount": N
 *   }
 *
 * LEGAL STATUS — TO BE DETERMINED BY PROJECT OWNER.
 * The registry entry that references this adapter ships with
 * licenseStatus="UNKNOWN", robotsStatus="unknown", termsStatus="unknown",
 * enabled=false. The pipeline's legal gate will refuse to run it until
 * the project owner reviews the current terms and marks it APPROVED.
 * Do NOT change those registry values without an explicit review.
 */

const API = "https://himalayas.app/jobs/api";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Himalayas";
const MAX_EMPLOYMENT_TYPE_LEN = 40;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, max = 50_000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function toDate(v: unknown): Date | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function deriveSourceJobId(
  guid: string,
  applicationLink: string,
): string | null {
  const source = guid || applicationLink;
  if (!source) return null;

  try {
    const u = new URL(source);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length >= 4 && last.length <= 200) {
      return last;
    }
  } catch {
    // not a URL; fall through
  }

  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hash = (h >>> 0).toString(16).padStart(8, "0");
  return hash || null;
}

function joinLocations(raw: unknown): string {
  const parts = asArray(raw)
    .map((x) => str(x, 100).trim())
    .filter(Boolean);
  if (parts.length === 0) return "Remote";
  if (parts.length === 1) return parts[0];
  return parts.join(", ");
}

function mapItem(item: unknown, attribution: string): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;

  const title = str(j.title, 300).trim();
  const company = str(j.companyName, 200).trim();
  const guid = str(j.guid, 2000).trim();
  const applicationLink = str(j.applicationLink, 2000).trim();

  if (!title || !company) return null;
  const sourceJobId = deriveSourceJobId(guid, applicationLink);
  if (!sourceJobId) return null;

  const rawApply = applicationLink || guid;
  const applyUrl = normalizeJobUrl(rawApply) || (rawApply || null);
  const externalUrl = normalizeJobUrl(guid) || (guid || null);

  const rawHtml = str(j.description, 200_000);
  const description = stripHtml(rawHtml) || title;

  const categories = asArray(j.categories)
    .map((c) => str(c, 80).trim())
    .filter(Boolean);
  const skills = asArray(j.skills)
    .map((s) => str(s, 80).trim())
    .filter(Boolean);
  const tags = Array.from(new Set([...categories, ...skills]));

  const rawJobType = str(j.jobType, 80).trim();
  const employmentType =
    rawJobType && rawJobType.length <= MAX_EMPLOYMENT_TYPE_LEN
      ? rawJobType
      : "full-time";

  const remote = typeof j.remote === "boolean" ? j.remote : true;

  return {
    sourceKey: "himalayas",
    sourceJobId,
    externalId: `himalayas:${sourceJobId}`,
    title,
    company,
    location: joinLocations(j.locationRestrictions),
    description,
    descriptionIsSnippet: false,
    applyUrl,
    externalUrl,
    remote,
    employmentType,
    tags,
    skills,
    publishedAt: toDate(j.pubDate),
    attribution,
  };
}

export const himalayasAdapter: JobSourceAdapter = {
  key: "himalayas",
  async fetchPage(
    options: AdapterFetchOptions = {},
  ): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;

    const rateLimit =
      typeof cfg?.rateLimitPerMinute === "number" &&
      cfg.rateLimitPerMinute > 0
        ? cfg.rateLimitPerMinute
        : DEFAULT_RATE_LIMIT_PER_MINUTE;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = cfg?.httpConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxResponseBytes =
      cfg?.httpConfig?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const attribution = cfg?.attribution || DEFAULT_ATTRIBUTION;

    if (!tryAcquireSourceQuota("himalayas", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
        nextCursor: null,
      };
    }

    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(Math.max(1, options.perPage ?? 100), 100);
    const offset = (page - 1) * perPage;

    const url = new URL(API);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(perPage));

    const result = await fetchWithRetry(url.toString(), {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
      maxResponseBytes,
    });

    if (!result.ok) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [result.error || `http_${result.status}`],
        nextCursor: null,
      };
    }

    let data: unknown;
    try {
      data = JSON.parse(result.body);
    } catch {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["malformed_json"],
        nextCursor: null,
      };
    }

    const root = asRecord(data);
    const list = root ? asArray(root.jobs) : [];

    const jobs: IngestJobDraft[] = [];
    for (const item of list) {
      const draft = mapItem(item, attribution);
      if (draft) jobs.push(draft);
    }

    const totalCount =
      root && typeof root.totalCount === "number"
        ? Math.max(0, Math.floor(root.totalCount))
        : null;
    const hasMore =
      totalCount !== null
        ? offset + list.length < totalCount
        : list.length >= perPage;

    return {
      jobs,
      fetched: list.length,
      hasMore,
      nextCursor: null,
      errors: [],
    };
  },
};
