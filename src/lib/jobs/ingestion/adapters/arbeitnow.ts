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

const API = "https://www.arbeitnow.com/api/job-board-api";

/** Adapter-local defaults; overridable via `sourceConfig.httpConfig`. */
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 10_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;

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

function mapItem(item: unknown): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;
  const slug = str(j.slug, 200);
  const title = str(j.title, 300).trim();
  const company = str(j.company_name, 200).trim();
  if (!slug || !title || !company) return null;

  const rawUrl = str(j.url, 2000) || `https://www.arbeitnow.com/jobs/${slug}`;
  const url = normalizeJobUrl(rawUrl) || rawUrl;
  const rawHtml = str(j.description, 200_000);
  const description = stripHtml(rawHtml) || title;
  const tags = asArray(j.tags)
    .map((t) => str(t, 80))
    .filter(Boolean);
  const jobTypes = asArray(j.job_types)
    .map((t) => str(t, 40))
    .filter(Boolean);
  const created =
    typeof j.created_at === "number" ? new Date(j.created_at * 1000) : null;

  return {
    sourceKey: "arbeitnow",
    sourceJobId: slug,
    externalId: `arbeitnow:${slug}`,
    title,
    company,
    location: str(j.location, 300) || "Remote",
    description,
    descriptionIsSnippet: false,
    applyUrl: url,
    externalUrl: url,
    remote: Boolean(j.remote),
    employmentType: jobTypes[0] || "full-time",
    tags,
    skills: tags,
    publishedAt: created,
    attribution: "Jobs via Arbeitnow",
  };
}

export const arbeitnowAdapter: JobSourceAdapter = {
  key: "arbeitnow",
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

    if (!tryAcquireSourceQuota("arbeitnow", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
      };
    }

    const page = options.page ?? 1;
    const perPage = Math.min(options.perPage ?? 100, 100);
    const url = new URL(API);
    url.searchParams.set("page", String(page));
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
      };
    }

    const list = Array.isArray(data)
      ? data
      : asArray(asRecord(data)?.data);
    const jobs = list
      .map(mapItem)
      .filter((j): j is IngestJobDraft => Boolean(j));

    return {
      jobs,
      fetched: list.length,
      hasMore: list.length >= perPage,
      nextCursor: null,
      errors: [],
    };
  },
};
