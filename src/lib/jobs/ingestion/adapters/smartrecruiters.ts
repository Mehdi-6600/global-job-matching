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
import {
  getEligibleBoards,
  recordBoardCheck,
  type AtsProvider,
} from "../ats-discovery";

/**
 * SmartRecruiters public postings adapter.
 *
 * Endpoint (public, paginated per company):
 *   GET https://api.smartrecruiters.com/v1/companies/{company}/postings
 *       ?offset=0&limit=100
 *
 * Response:
 *   { content: [ { id, name, location, releasedDate, refNumber, ... } ], totalFound }
 * Detail (optional):
 *   GET https://api.smartrecruiters.com/v1/companies/{company}/postings/{id}
 *
 * Identity:
 *   sourceJobId = "<company>:<id>"
 *   externalId  = "smartrecruiters:<company>:<id>"
 *
 * Legal model: same as Greenhouse — public company career JSON the employer
 * publishes for their own careers site. Only boards marked APPROVED in
 * SourceCompany are fetched. Always keep apply URL + attribution.
 *
 * Vercel Hobby: ONE company board per fetchPage.
 */

const PROVIDER = "smartrecruiters" as AtsProvider;
const LIST_API = (company: string, offset: number, limit: number) =>
  `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
    company,
  )}/postings?offset=${offset}&limit=${limit}`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 8_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via SmartRecruiters";
const MAX_BOARDS_PER_PAGE = 1;
const POSTINGS_PER_BOARD = 100;

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
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function mapPosting(
  raw: unknown,
  company: string,
  attribution: string,
): IngestJobDraft | null {
  const j = asRecord(raw);
  if (!j) return null;

  const jobId = str(j.id, 80).trim() || str(j.uuid, 80).trim();
  if (!jobId) return null;

  const title = str(j.name, 300).trim() || str(j.title, 300).trim();
  if (!title) return null;

  const loc = asRecord(j.location);
  const location =
    (loc
      ? [str(loc.city, 80), str(loc.region, 80), str(loc.country, 80)]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", ")
      : "") ||
    str(j.location, 200).trim() ||
    "Remote";

  const applyUrlRaw =
    str(j.applyUrl, 2000) ||
    str(j.jobAdUrl, 2000) ||
    str(j.ref, 2000) ||
    `https://jobs.smartrecruiters.com/${encodeURIComponent(company)}/${encodeURIComponent(jobId)}`;
  const externalUrl = normalizeJobUrl(applyUrlRaw) || applyUrlRaw || null;

  const descHtml =
    str(j.jobDescription, 200_000) ||
    str(j.description, 200_000) ||
    str(asRecord(j.jobAd)?.sections, 200_000);
  const description = stripHtml(descHtml) || title;

  const remote = /remote/i.test(location) || /remote/i.test(title);

  return {
    sourceKey: "smartrecruiters",
    sourceJobId: `${company}:${jobId}`,
    externalId: `smartrecruiters:${company}:${jobId}`,
    title,
    company,
    location,
    description,
    descriptionIsSnippet: description === title,
    applyUrl: externalUrl,
    externalUrl,
    remote,
    employmentType: str(j.typeOfEmployment, 40) || "full-time",
    tags: [],
    skills: [],
    publishedAt: toDate(j.releasedDate) || toDate(j.createdOn),
    attribution,
  };
}

export const smartrecruitersAdapter: JobSourceAdapter = {
  key: "smartrecruiters",
  async fetchPage(
    options: AdapterFetchOptions = {},
  ): Promise<AdapterFetchResult> {
    const cfg = options.sourceConfig;
    const rateLimit =
      typeof cfg?.rateLimitPerMinute === "number" && cfg.rateLimitPerMinute > 0
        ? cfg.rateLimitPerMinute
        : DEFAULT_RATE_LIMIT_PER_MINUTE;
    const timeoutMs = cfg?.httpConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = cfg?.httpConfig?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxResponseBytes =
      cfg?.httpConfig?.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const attribution = cfg?.attribution || DEFAULT_ATTRIBUTION;

    if (!tryAcquireSourceQuota("smartrecruiters", rateLimit)) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: ["rate_limited"],
        nextCursor: null,
      };
    }

    const perPage = Math.min(
      Math.max(1, options.perPage ?? MAX_BOARDS_PER_PAGE),
      MAX_BOARDS_PER_PAGE,
    );
    const page = Math.max(1, options.page ?? 1);

    const boards = await getEligibleBoards(PROVIDER, 2000);
    if (boards.length === 0) {
      return { jobs: [], hasMore: false, fetched: 0, errors: [], nextCursor: null };
    }

    const start = (page - 1) * perPage;
    const slice = boards.slice(start, start + perPage);
    const hasMore = start + slice.length < boards.length;

    if (slice.length === 0) {
      return { jobs: [], hasMore: false, fetched: 0, errors: [], nextCursor: null };
    }

    const drafts: IngestJobDraft[] = [];
    const errors: string[] = [];
    let fetched = 0;

    for (const board of slice) {
      const company = board.boardIdentifier;
      const offset = 0;
      let boardFetched = 0;

      // One list page per board per fetchPage (Hobby time budget).
      const url = LIST_API(company, offset, POSTINGS_PER_BOARD);
      const result = await fetchWithRetry(url, {
        signal: options.signal,
        timeoutMs,
        maxAttempts,
        maxResponseBytes,
      });

      if (!result.ok) {
        const err = result.error || `http_${result.status}`;
        errors.push(`board:${company}:${err}`);
        await recordBoardCheck(PROVIDER, company, { ok: false, error: err });
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(result.body);
      } catch {
        errors.push(`board:${company}:malformed_json`);
        await recordBoardCheck(PROVIDER, company, {
          ok: false,
          error: "malformed_json",
        });
        continue;
      }

      const list = asArray(asRecord(data)?.content);
      boardFetched = list.length;
      fetched += boardFetched;

      for (const item of list) {
        const draft = mapPosting(item, company, attribution);
        if (!draft) continue;
        drafts.push({
          ...draft,
          company: board.companyName || draft.company,
        });
      }

      await recordBoardCheck(PROVIDER, company, { ok: true });
    }

    return {
      jobs: drafts,
      hasMore,
      fetched,
      nextCursor: null,
      errors,
    };
  },
};
