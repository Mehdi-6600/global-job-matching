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
 * The Muse Public Jobs API — Career discovery platform.
 *
 * Docs: https://www.themuse.com/developers/api/v2
 * Endpoint: https://www.themuse.com/api/public/jobs?page=0
 * Optional auth: ?api_key=YOUR_KEY (3600/hr vs 500/hr unauth)
 *
 * LEGAL STATUS — APPROVED (reviewed 2026-10-18).
 *
 * The Muse API Terms (https://www.themuse.com/developers/api/v2/terms):
 *   Section 3.1 Grants LICENSEE a limited, non-exclusive, non-transferable,
 *   non-sublicensable, revocable right to access and use the API to
 *   obtain, use, distribute and transmit Muse Content to format and
 *   display Muse Content through Apps in accordance with Terms.
 *
 * Requirements we honor:
 *   - Display Muse Content formatted/displayed via Apps (job board qualifies)
 *   - Attribution implicit — we store "Jobs via The Muse" + canonical URL
 *   - Link back to original landing page (refs.landing_page)
 *   - Rate limits honored: 500/hr unauth, 3600/hr with api_key
 *   - No logo misuse, no misrepresentation
 *   - Contact api@themuse.com for issues
 *
 * Response shape:
 *   {
 *     page: 0, page_count: 20749, total: 414964,
 *     results: [
 *       {
 *         id: 21438954,
 *         name: "Licensed Practical Nurse...",
 *         company: { id, name, short_name },
 *         locations: [{ name: "Caledonia, MI" }],
 *         categories: [{ name: "..." }],
 *         levels: [{ name: "Mid Level" }],
 *         tags: [...],
 *         contents: "<html> job description </html>",
 *         refs: { landing_page: "https://www.themuse.com/jobs/..."},
 *         publication_date: "2026-03-17T13:37:16Z",
 *         type: "external"
 *       }
 *     ]
 *   }
 *
 * Pagination: page parameter (0-indexed in API, we convert from pipeline's 1-indexed)
 * Per page: fixed 20 by API (cannot change)
 */

const API = "https://www.themuse.com/api/public/jobs";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 10_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via The Muse";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
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
  if (!v) return null;
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isTooOld(publishedAt: Date | null): boolean {
  if (!publishedAt) return false;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - publishedAt.getTime() > thirtyDaysMs;
}

function mapItem(item: unknown, attribution: string): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;

  const rawId = j.id;
  const idStr = str(rawId, 100).trim();
  if (!idStr) return null;
  const sourceJobId = idStr;

  const title = str(j.name, 400).trim();
  if (!title || title.length < 3) return null;

  const companyObj = asRecord(j.company);
  const company = str(companyObj?.name, 300).trim() || str(j.company_name, 300).trim();
  if (!company || company.length < 2) return null;

  // Location — first location name
  let location = "Remote";
  const locs = asArray(j.locations);
  if (locs.length > 0) {
    const locNames = locs
      .map((l) => str(asRecord(l)?.name, 300).trim() || str(l, 300).trim())
      .filter(Boolean);
    if (locNames.length > 0) location = locNames[0]!;
  }

  // Description — contents (HTML)
  const rawContents = str(j.contents, 200_000);
  const description = stripHtml(rawContents) || rawContents || title;
  if (description.trim().length < 20) return null;

  // URLs — landing_page is canonical
  const refs = asRecord(j.refs);
  const landing = str(refs?.landing_page, 2000).trim();
  const shortName = str(j.short_name, 500).trim();
  const fallbackUrl = shortName
    ? `https://www.themuse.com/jobs/${str(companyObj?.short_name, 200) || "company"}/${shortName}`
    : "";
  const rawUrl = landing || fallbackUrl;
  const externalUrl = normalizeJobUrl(rawUrl) || rawUrl || null;
  const applyUrl = externalUrl;

  const publishedAt = toDate(j.publication_date);
  if (isTooOld(publishedAt)) return null;

  // Tags — from categories + levels + tags
  const cats = asArray(j.categories).map((c) => str(asRecord(c)?.name, 60).trim()).filter(Boolean);
  const lvls = asArray(j.levels).map((l) => str(asRecord(l)?.name, 60).trim()).filter(Boolean);
  const tgs = asArray(j.tags).map((t) => str(t, 60).trim()).filter(Boolean);
  const tags = Array.from(new Set([...cats, ...lvls, ...tgs])).slice(0, 20);

  const employmentType = lvls[0] ? lvls[0]!.toLowerCase() : "full-time";

  const remote = /remote|anywhere|flexible/i.test(`${location} ${tags.join(" ")}`);

  return {
    sourceKey: "themuse",
    sourceJobId,
    externalId: `themuse:${sourceJobId}`,
    title,
    company,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl,
    externalUrl,
    remote,
    employmentType,
    tags,
    skills: tags,
    publishedAt,
    attribution,
  };
}

export const themuseAdapter: JobSourceAdapter = {
  key: "themuse",
  async fetchPage(options: AdapterFetchOptions = {}): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;
    const rateLimit = typeof cfg?.rateLimitPerMinute === "number" && cfg.rateLimitPerMinute > 0 ? cfg.rateLimitPerMinute : DEFAULT_RATE_LIMIT_PER_MINUTE;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = cfg?.httpConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxResponseBytes = cfg?.httpConfig?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const attribution = cfg?.attribution || DEFAULT_ATTRIBUTION;

    if (!tryAcquireSourceQuota("themuse", rateLimit)) {
      return { jobs: [], hasMore: false, fetched: 0, errors: ["rate_limited"] };
    }

    // Pipeline page is 1-indexed; Muse API is 0-indexed
    const page = Math.max(1, options.page ?? 1);
    const museApiPage = page - 1;

    const url = new URL(API);
    url.searchParams.set("page", String(museApiPage));

    // Optional API key increases rate limit 500→3600/hr
    const apiKey = process.env.THEMUSE_API_KEY?.trim();
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }

    const result = await fetchWithRetry(url.toString(), {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
      maxResponseBytes,
      headers: { Accept: "application/json" },
    });

    if (!result.ok) {
      return { jobs: [], hasMore: false, fetched: 0, errors: [result.error || `http_${result.status}`] };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(result.body);
    } catch {
      return { jobs: [], hasMore: false, fetched: 0, errors: ["malformed_json"] };
    }

    const root = asRecord(raw);
    const results = root ? asArray(root.results) : [];
    const pageCount = typeof root?.page_count === "number" ? (root.page_count as number) : 0;

    const jobs: IngestJobDraft[] = [];
    for (const item of results) {
      const draft = mapItem(item, attribution);
      if (draft) jobs.push(draft);
    }

    const hasMore = pageCount > 0 ? page < pageCount : results.length === 20;

    return {
      jobs,
      fetched: results.length,
      hasMore,
      errors: [],
    };
  },
};
