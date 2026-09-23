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
 * RemoteOK public jobs feed.
 *
 * Documentation: https://remoteok.com/api
 *
 * Response shape (public, at time of writing): a JSON array whose
 * first element is metadata (contains "legal" text) and whose
 * remaining elements are jobs:
 *   [
 *     { "legal": "...", "last_updated": 1700000000 },
 *     {
 *       "id": "123456",
 *       "slug": "remote-senior-engineer-123456",
 *       "epoch": 1700000000,
 *       "date": "2024-01-01T12:00:00+00:00",
 *       "company": "Acme",
 *       "position": "Senior Engineer",
 *       "tags": ["react", "typescript"],
 *       "logo": "...",
 *       "description": "<p>...</p>",
 *       "location": "Worldwide",
 *       "salary_min": 0,
 *       "salary_max": 0,
 *       "apply_url": "https://remoteok.com/remote-jobs/...",
 *       "url": "https://remoteok.com/remote-jobs/..."
 *     },
 *     ...
 *   ]
 *
 * LEGAL STATUS — APPROVED (reviewed 2026-09-24).
 *
 * RemoteOK publishes an explicit "API Terms of Service" in the first
 * item of the /api response. It permits third-party consumption and
 * redistribution, conditioned on:
 *   1. a follow (non-nofollow) link back to RemoteOK, and
 *   2. naming "Remote OK" as the source.
 *
 * The RemoteOK logo is a registered trademark and must NOT be used
 * without written permission. We do not render the logo.
 *
 * The registry entry (src/lib/jobs/ingestion/registry.ts) mirrors
 * these fields:
 *   licenseStatus="APPROVED"
 *   termsStatus="allowed"
 *   robotsStatus="allowed"
 *   enabled=true
 *   attributionRequired=true
 *   attribution="Jobs via Remote OK"
 *
 * Enforcement note: the follow-link condition is a UI/render-time
 * responsibility. The pipeline carries the attribution string on
 * every draft; the UI must render the RemoteOK link WITHOUT
 * rel="nofollow" and must not use the RemoteOK logo.
 */

const API = "https://remoteok.com/api";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const DEFAULT_ATTRIBUTION = "Jobs via Remote OK";

/** Hard cap on tag strings; entries longer than this are dropped. */
const MAX_TAG_LEN = 60;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, max = 50_000): string {
  if (typeof v === "string") return v.slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function toDate(v: unknown): Date | null {
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * RemoteOK exposes a numeric-looking `id` and a `slug`. Prefer the
 * numeric id (stable) and fall back to the slug or URL hash.
 */
function deriveSourceJobId(
  rawId: unknown,
  slug: string,
  url: string,
): string | null {
  const idStr = str(rawId, 40).trim();
  if (idStr) return idStr;
  if (slug) return slug.slice(0, 200);
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

/**
 * RemoteOK mixes named keys, arrays, and HTML payloads. We only
 * accept the primary job payload — no salary reconstruction, no
 * "apply via" inference. If apply_url is absent we fall back to the
 * canonical `url` so dedup has a stable anchor.
 */
function mapItem(item: unknown, attribution: string): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;

  // First element is feed metadata (has `legal`), not a job.
  if ("legal" in j && !("position" in j)) return null;

  const title = str(j.position, 300).trim();
  const company = str(j.company, 200).trim();
  const slug = str(j.slug, 200).trim();
  const urlField = str(j.url, 2000).trim();
  const applyField = str(j.apply_url, 2000).trim();

  if (!title || !company) return null;
  const sourceJobId = deriveSourceJobId(j.id, slug, urlField || applyField);
  if (!sourceJobId) return null;

  const rawApply = applyField || urlField;
  const applyUrl = normalizeJobUrl(rawApply) || (rawApply || null);
  const externalUrl = normalizeJobUrl(urlField) || (urlField || null);

  const rawHtml = str(j.description, 200_000);
  const description = stripHtml(rawHtml) || title;

  const rawTags = asArray(j.tags)
    .map((t) => str(t, MAX_TAG_LEN).trim())
    .filter(Boolean);
  const tags = Array.from(new Set(rawTags));

  const rawLocation = str(j.location, 200).trim();
  const location = rawLocation || "Remote";

  const publishedAt = toDate(j.date) ?? toDate(j.epoch);

  const salaryMin =
    typeof j.salary_min === "number" && j.salary_min > 0 ? j.salary_min : null;
  const salaryMax =
    typeof j.salary_max === "number" && j.salary_max > 0 ? j.salary_max : null;

  return {
    sourceKey: "remoteok",
    sourceJobId,
    externalId: `remoteok:${sourceJobId}`,
    title,
    company,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl,
    externalUrl,
    remote: true,
    employmentType: "full-time",
    salaryMin,
    salaryMax,
    tags,
    skills: [],
    publishedAt,
    attribution,
  };
}

export const remoteokAdapter: JobSourceAdapter = {
  key: "remoteok",
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

    if (!tryAcquireSourceQuota("remoteok", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
        nextCursor: null,
      };
    }

    /*
     * RemoteOK returns a single JSON array — no pagination parameters.
     * The registry entry declares pagination: "single"; anything beyond
     * page 1 is a no-op to avoid refetching identical content.
     */
    const page = Math.max(1, options.page ?? 1);
    if (page > 1) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [],
        nextCursor: null,
      };
    }

    const result = await fetchWithRetry(API, {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
      maxResponseBytes,
      // RemoteOK requires a plain UA-friendly Accept; JSON is standard.
      headers: { Accept: "application/json" },
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

    const list = Array.isArray(data) ? data : [];

    const jobs: IngestJobDraft[] = [];
    for (const item of list) {
      const draft = mapItem(item, attribution);
      if (draft) jobs.push(draft);
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
