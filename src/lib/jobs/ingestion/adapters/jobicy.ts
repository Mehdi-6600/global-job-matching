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
 * Jobicy public remote-jobs API.
 *
 * Documentation: https://jobicy.com/jobs-rss-feed
 * JSON endpoint: https://jobicy.com/api/v2/remote-jobs
 *
 * Response shape (public, at time of writing):
 *   {
 *     "jobCount": N,
 *     "jobs": [
 *       {
 *         "id": 123456,
 *         "url": "https://jobicy.com/jobs/123456-...",
 *         "jobSlug": "senior-frontend-engineer",
 *         "jobTitle": "...",
 *         "companyName": "...",
 *         "companyLogo": "...",
 *         "jobIndustry": ["Engineering"],
 *         "jobType": ["full-time"],
 *         "jobGeo": "Anywhere",
 *         "jobLevel": "Senior",
 *         "jobExcerpt": "...",
 *         "": "<p>...</p>",
 *         "pubDate": "2024-01-01 12:00:00",
 *         ...
 *       }
 *     ]
 *   }
 *
 * LEGAL STATUS — TO BE DETERMINED BY PROJECT OWNER.
 * Registry entry ships with licenseStatus="UNKNOWN",
 * robotsStatus="unknown", termsStatus="unknown", enabled=false.
 * Do NOT change without an explicit review.
 */

const API = "https://jobicy.com/api/v2/remote-jobs";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Jobicy";

/** Jobicy caps `count` at 50 per request. */
const MAX_PER_PAGE = 50;

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

/**
 * Jobicy returns pubDate as "YYYY-MM-DD HH:MM:SS" (UTC, no timezone).
 * Safari and Node both parse this inconsistently; we normalize to ISO.
 */
function toDate(v: unknown): Date | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v) {
    const s = v.trim();
    // Try ISO first
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso;
    // Try "YYYY-MM-DD HH:MM:SS" as UTC
    const m = s.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
    );
    if (m) {
      const d = new Date(
        Date.UTC(
          Number(m[1]),
          Number(m[2]) - 1,
          Number(m[3]),
          Number(m[4]),
          Number(m[5]),
          Number(m[6]),
        ),
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** Derive a stable source-level id; prefer numeric `id`, else slug. */
function deriveSourceJobId(
  rawId: unknown,
  jobSlug: string,
  url: string,
): string | null {
  if (typeof rawId === "number" && Number.isFinite(rawId) && rawId > 0) {
    return String(Math.floor(rawId));
  }
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim().slice(0, 200);
  }
  if (jobSlug) return jobSlug.slice(0, 200);
  if (url) {
    let h = 0x811c9dc5;
    for (let i = 0; i < url.length; i++) {
      h ^= url.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  return null;
}

export const jobicyAdapter: JobSourceAdapter = {
  key: "jobicy",
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

    if (!tryAcquireSourceQuota("jobicy", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
        nextCursor: null,
      };
    }

    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(
      Math.max(1, options.perPage ?? MAX_PER_PAGE),
      MAX_PER_PAGE,
    );

    const url = new URL(API);
    url.searchParams.set("count", String(perPage));

    /*
     * Jobicy has no explicit offset/page parameter; it returns the most
     * recent N items. We therefore only ever fetch page 1 meaningfully.
     * When the pipeline asks for page > 1 we short-circuit to avoid
     * re-fetching and re-inserting the same jobs. The registry entry
     * declares pagination: "single" so this path is never reached in
     * normal operation — this is a safety net.
     */
    if (page > 1) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [],
        nextCursor: null,
      };
    }

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
      const j = asRecord(item);
      if (!j) continue;

      const title = str(j.jobTitle, 300).trim();
      const company = str(j.companyName, 200).trim();
      const jobSlug = str(j.jobSlug, 200).trim();
      const rawUrl = str(j.url, 2000).trim();

      if (!title || !company) continue;
      const sourceJobId = deriveSourceJobId(j.id, jobSlug, rawUrl);
      if (!sourceJobId) continue;

      const applyUrl = normalizeJobUrl(rawUrl) || (rawUrl || null);
      const rawHtml = str(j.jobDescription, 200_000) || str(j.jobExcerpt, 5_000);
      const description = stripHtml(rawHtml) || title;

      const industries = asArray(j.jobIndustry)
        .map((x) => str(x, 80).trim())
        .filter(Boolean);
      const rawTypes = asArray(j.jobType)
        .map((x) => str(x, 40).trim())
        .filter(Boolean);
      const employmentType = rawTypes[0] || "full-time";

      const geo = str(j.jobGeo, 200).trim();
      const location = geo || "Remote";

      jobs.push({
        sourceKey: "jobicy",
        sourceJobId,
        externalId: `jobicy:${sourceJobId}`,
        title,
        company,
        location,
        description,
        descriptionIsSnippet: false,
        applyUrl,
        externalUrl: applyUrl,
        remote: true,
        employmentType,
        tags: industries,
        skills: [],
        publishedAt: toDate(j.pubDate),
        attribution,
      });
    }

    return {
      jobs,
      fetched: list.length,
      hasMore: false,
      nextCursor: null,
      errors: [],
    };
  },
};
