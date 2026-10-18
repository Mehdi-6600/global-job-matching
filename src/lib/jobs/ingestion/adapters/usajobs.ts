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
 * USAJOBS Search API — Official U.S. Federal Government hiring board.
 *
 * Docs: https://developer.usajobs.gov/
 * Endpoint: https://data.usajobs.gov/api/search
 * Auth: Authorization-Key: <API_KEY> + User-Agent: <registered email> + Host: data.usajobs.gov
 *
 * LEGAL STATUS — APPROVED (reviewed 2026-10-18).
 *
 * USAJOBS Terms of Service Section 2 (Public Data Use) as of 2026-10-12:
 *   "Public Data may be copied, stored, reformatted, adapted, analyzed,
 *    published, redistributed, and used for lawful commercial or noncommercial
 *    purposes. Prior OPM approval is not required."
 * Consistent with 44 U.S.C. §§ 3502 and 3506(b)(6) — open license.
 *
 * Requirements we honor:
 *   - Identify USAJOBS as source (attributionRequired=true)
 *   - Link to official job announcement (externalUrl/applyUrl = USAJOBS URI)
 *   - Include retrieval date (we store publishedAt/firstSeenAt)
 *   - Disclose unofficial product (UI text — not adapter concern)
 *   - Do not misrepresent, falsify affiliation, or spoof applications
 *
 * Response shape (simplified):
 *   {
 *     SearchResult: {
 *       SearchResultCount: 25,
 *       SearchResultCountAll: 98765,
 *       SearchResultItems: [
 *         {
 *           MatchedObjectId: "12345678",
 *           MatchedObjectDescriptor: {
 *             PositionID: "ABC-123",
 *             PositionTitle: "Software Engineer",
 *             OrganizationName: "Dept of Commerce",
 *             DepartmentName: "Census",
 *             PositionLocationDisplay: "Washington, DC, US",
 *             PositionLocation: [{ CityName, CountrySubDivisionCode, LocationName }],
 *             JobCategory: [{ Name }],
 *             QualificationSummary: "...",
 *             PositionStartDate: "2026-10-15T...",
 *             PositionEndDate: "2026-11-15T...",
 *             ApplyURI: ["https://www.usajobs.gov/job/123"],
 *             UserArea: { Details: { JobSummary, MajorDuties, Education, LowGrade, HighGrade } }
 *           }
 *         }
 *       ]
 *     }
 *   }
 *
 * Pagination: Query params Page (1-indexed) + ResultsPerPage (1-500)
 * Rate limit: undocumented — self-throttled to 10/min
 */

const API = "https://data.usajobs.gov/api/search";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const DEFAULT_ATTRIBUTION = "Jobs via USAJOBS (U.S. Office of Personnel Management)";
const DEFAULT_PER_PAGE = 50;

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
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** 30-day freshness filter — skip stale federal announcements */
function isTooOld(publishedAt: Date | null): boolean {
  if (!publishedAt) return false;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - publishedAt.getTime() > thirtyDaysMs;
}

function mapItem(item: unknown, attribution: string): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;
  const descWrap = asRecord(j.MatchedObjectDescriptor);
  if (!descWrap) return null;

  const matchedObjectId = str(j.MatchedObjectId, 100).trim();
  const positionId = str(descWrap.PositionID, 100).trim();
  const sourceJobId = positionId || matchedObjectId;
  if (!sourceJobId) return null;

  const title = str(descWrap.PositionTitle, 400).trim();
  if (!title || title.length < 3) return null;

  const orgName = str(descWrap.OrganizationName, 300).trim();
  const deptName = str(descWrap.DepartmentName, 300).trim();
  const company = orgName || deptName || "U.S. Federal Government";
  if (!company || company.length < 2) return null;

  // Location — prefer display string, fallback to structured
  let location = str(descWrap.PositionLocationDisplay, 300).trim();
  if (!location) {
    const locs = asArray(descWrap.PositionLocation);
    const first = asRecord(locs[0]);
    if (first) {
      const city = str(first.CityName, 100).trim();
      const state = str(first.CountrySubDivisionCode, 20).trim();
      const country = str(first.CountryCode, 10).trim();
      location = [city, state, country].filter(Boolean).join(", ") || "United States";
    }
  }
  if (!location) location = "United States";

  // Description — combine userArea details
  const userArea = asRecord(descWrap.UserArea);
  const details = asRecord(userArea?.Details);
  const summary = str(details?.JobSummary, 100_000).trim();
  const duties = str(details?.MajorDuties, 100_000).trim();
  const qual = str(descWrap.QualificationSummary, 50_000).trim();
  const edu = str(details?.Education, 50_000).trim();
  let rawDesc = summary || duties || qual || "";
  if (duties && duties !== summary) rawDesc = `${summary}\n\n${duties}`;
  if (edu) rawDesc = `${rawDesc}\n\nEducation: ${edu}`;
  if (qual && qual !== summary) rawDesc = `${rawDesc}\n\nQualifications: ${qual}`;
  const description = stripHtml(rawDesc) || rawDesc || title;
  if (description.trim().length < 20) return null;

  // URLs — ApplyURI is canonical; fallback to USAJOBS page
  const applyUri = asArray(descWrap.ApplyURI).map((u) => str(u, 2000).trim()).find(Boolean);
  const positionUri = str(descWrap.PositionURI, 2000).trim();
  const canonical = applyUri || positionUri || `https://www.usajobs.gov/job/${sourceJobId}`;
  const normalizedApply = normalizeJobUrl(canonical) || canonical;
  const normalizedExternal = normalizeJobUrl(positionUri || canonical) || positionUri || canonical;

  // Dates
  const publishedAt =
    toDate(descWrap.PositionStartDate) ||
    toDate(descWrap.PublicationStartDate) ||
    toDate(descWrap.PositionOpeningDate) ||
    null;
  if (isTooOld(publishedAt)) return null;

  const expiresAt = toDate(descWrap.PositionEndDate) || toDate(descWrap.ApplicationCloseDate) || null;

  // Expired check — skip if already closed
  if (expiresAt && expiresAt.getTime() < Date.now()) return null;

  // Tags — from JobCategory + Organization + PositionOfferingType
  const jobCats = asArray(descWrap.JobCategory).map((c) => str(asRecord(c)?.Name, 60).trim()).filter(Boolean);
  const tags = Array.from(new Set([...jobCats, orgName].filter(Boolean))).slice(0, 20);

  // Employment type
  const offering = str(asRecord(descWrap.PositionOfferingType)?.[0] ? asRecord(asArray(descWrap.PositionOfferingType)[0])?.Name : descWrap.PositionOfferType, 40).trim();
  const employmentType = offering || "full-time";

  // Remote detection — federal remote indicator
  const remote =
    /remote|telework|anywhere/i.test(`${location} ${title} ${description.slice(0, 500)}`) ||
    str(descWrap.PositionSchedule, 100).toLowerCase().includes("remote");

  return {
    sourceKey: "usajobs",
    sourceJobId,
    externalId: `usajobs:${sourceJobId}`,
    title,
    company,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl: normalizedApply || null,
    externalUrl: normalizedExternal || null,
    remote,
    employmentType,
    tags,
    skills: tags,
    publishedAt,
    expiresAt,
    attribution,
  };
}

export const usajobsAdapter: JobSourceAdapter = {
  key: "usajobs",
  async fetchPage(options: AdapterFetchOptions = {}): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;
    const rateLimit = typeof cfg?.rateLimitPerMinute === "number" && cfg.rateLimitPerMinute > 0 ? cfg.rateLimitPerMinute : DEFAULT_RATE_LIMIT_PER_MINUTE;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = cfg?.httpConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxResponseBytes = cfg?.httpConfig?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const attribution = cfg?.attribution || DEFAULT_ATTRIBUTION;

    if (!tryAcquireSourceQuota("usajobs", rateLimit)) {
      return { jobs: [], hasMore: false, fetched: 0, errors: ["rate_limited"] };
    }

    // API key required — fail gracefully if not configured (registry will show source but skip fetch)
    const apiKey = process.env.USAJOBS_API_KEY?.trim();
    const userAgent = process.env.USAJOBS_USER_AGENT?.trim() || process.env.USAJOBS_EMAIL?.trim();
    if (!apiKey || !userAgent) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["missing_usajobs_credentials: set USAJOBS_API_KEY and USAJOBS_USER_AGENT (email)"],
      };
    }

    const page = Math.max(1, options.page ?? 1);
    const perPage = Math.min(options.perPage ?? DEFAULT_PER_PAGE, 100);

    const url = new URL(API);
    url.searchParams.set("Page", String(page));
    url.searchParams.set("ResultsPerPage", String(perPage));
    // No Keyword filter — we ingest broad federal feed; pipeline dedup & category handle relevance
    // We sort by relevance default; Date filter could be added if API supports

    const result = await fetchWithRetry(url.toString(), {
      signal: options.signal,
      timeoutMs,
      maxAttempts,
      maxResponseBytes,
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": userAgent,
        "Authorization-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!result.ok) {
      // 401/403 = bad credentials, 429 = rate limited
      return { jobs: [], hasMore: false, fetched: 0, errors: [result.error || `http_${result.status}`] };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(result.body);
    } catch {
      return { jobs: [], hasMore: false, fetched: 0, errors: ["malformed_json"] };
    }

    const root = asRecord(raw);
    const searchResult = asRecord(root?.SearchResult);
    const items = searchResult ? asArray(searchResult.SearchResultItems) : [];

    const jobs: IngestJobDraft[] = [];
    for (const item of items) {
      const draft = mapItem(item, attribution);
      if (draft) jobs.push(draft);
    }

    // Pagination: SearchResultCountAll vs SearchResultCount
    const totalAll = typeof searchResult?.SearchResultCountAll === "number" ? (searchResult.SearchResultCountAll as number) : items.length;
    const fetchedSoFar = page * perPage;
    const hasMore = fetchedSoFar < totalAll && items.length >= perPage;

    return {
      jobs,
      fetched: items.length,
      hasMore,
      errors: [],
    };
  },
};
