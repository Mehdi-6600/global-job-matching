/**
 * Template adapter — DO NOT register this in SOURCE_REGISTRY.
 *
 * Copy this file to `<sourceKey>.ts`, replace every TODO with real code,
 * and add the registry entry + tests. See README.md in this folder.
 *
 * Filename starts with `_` intentionally: it signals "not a real source"
 * and is filtered out of any glob-based discovery (none today, but
 * future-proof).
 */
import type {
  AdapterFetchOptions,
  AdapterFetchResult,
  IngestJobDraft,
  JobSourceAdapter,
} from "../types";
import { fetchWithRetry } from "../http";
import { tryAcquireSourceQuota } from "../rate-limit";
import { normalizeJobUrl } from "../url";

/* ------------------------------------------------------------------ */
/* Configuration — change to match your source.                       */
/* ------------------------------------------------------------------ */

const SOURCE_KEY = "template";
const API_URL = "https://example.test/api/jobs";

/** Adapter-local defaults; overridable via `sourceConfig.httpConfig`. */
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 5_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;
const DEFAULT_ATTRIBUTION = "Jobs via Template";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, max = 50_000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

/**
 * Map one raw item to a draft, or return null to skip.
 * Never throw — malformed items should be skipped silently.
 */
function mapItem(item: unknown, attribution: string): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;

  // TODO: extract the source's own ID.
  const sourceJobId = str(j.id, 200);
  // TODO: extract title/company/location/description.
  const title = str(j.title, 300).trim();
  const company = str(j.company, 200).trim();
  if (!sourceJobId || !title || !company) return null;

  // TODO: build the canonical URL for this job.
  const rawUrl = str(j.url, 2000);
  const url = normalizeJobUrl(rawUrl) || rawUrl || null;

  // TODO: strip HTML from description if the source returns HTML.
  const description = str(j.description, 200_000);

  // TODO: extract tags / job type / remote / published date.
  const tags = asArray(j.tags)
    .map((t) => str(t, 80))
    .filter(Boolean);
  const employmentType = str(j.type, 40) || "full-time";
  const remote = Boolean(j.remote);
  const publishedAt =
    typeof j.created_at === "number" ? new Date(j.created_at * 1000) : null;

  return {
    sourceKey: SOURCE_KEY,
    sourceJobId,
    externalId: `${SOURCE_KEY}:${sourceJobId}`,
    title,
    company,
    location: str(j.location, 300) || "Remote",
    description: description || title,
    descriptionIsSnippet: false,
    applyUrl: url,
    externalUrl: url,
    remote,
    employmentType,
    tags,
    skills: tags,
    publishedAt,
    attribution,
  };
}

/* ------------------------------------------------------------------ */
/* Adapter                                                            */
/* ------------------------------------------------------------------ */

export const templateAdapter: JobSourceAdapter = {
  key: SOURCE_KEY,
  async fetchPage(
    options: AdapterFetchOptions = {},
  ): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;

    const rateLimit =
      typeof cfg?.rateLimitPerMinute === "number" && cfg.rateLimitPerMinute > 0
        ? cfg.rateLimitPerMinute
        : DEFAULT_RATE_LIMIT_PER_MINUTE;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts =
      cfg?.httpConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxResponseBytes =
      cfg?.httpConfig?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const attribution = cfg?.attribution || DEFAULT_ATTRIBUTION;

    // Self-imposed per-source rate limit (in-process).
    if (!tryAcquireSourceQuota(SOURCE_KEY, rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
      };
    }

    // TODO: build the URL for this page.
    const page = options.page ?? 1;
    const perPage = Math.min(options.perPage ?? 100, 100);
    const url = new URL(API_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(perPage));

    // TODO: add headers if needed (e.g. Accept: application/json).
    const res = await fetchWithRetry(url.toString(), {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
      maxResponseBytes,
    });

    if (!res.ok) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [res.error || `http_${res.status}`],
      };
    }

    // TODO: parse the body. Adjust if the API wraps items in { data: [...] }.
    let raw: unknown;
    try {
      raw = JSON.parse(res.body);
    } catch {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["malformed_json"],
      };
    }

    const items = Array.isArray(raw)
      ? raw
      : asArray(asRecord(raw)?.data);

    const jobs = items
      .map((item) => mapItem(item, attribution))
      .filter((j): j is IngestJobDraft => j !== null);

    // TODO: set hasMore based on your pagination mode.
    // For page-based: items.length >= perPage
    // For cursor-based: items.length > 0 && a valid nextCursor
    // For single: false
    const hasMore = items.length >= perPage;

    // TODO: for cursor/token pagination, extract nextCursor from the body.
    const nextCursor: string | null = null;

    return {
      jobs,
      fetched: items.length,
      hasMore,
      nextCursor,
      errors: [],
    };
  },
};
