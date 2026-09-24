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
 * Recruitee public offers adapter.
 *
 * Endpoint (public):
 *   GET https://{company}.recruitee.com/api/offers/
 *
 * Identity:
 *   sourceJobId = "<company>:<id>"
 *   externalId  = "recruitee:<company>:<id>"
 *
 * Public careers JSON published by the employer. APPROVED boards only.
 * ONE board per fetchPage for Vercel Hobby.
 */

const PROVIDER = "recruitee" as AtsProvider;
const OFFERS_API = (company: string) =>
  `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 8_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Recruitee";
const MAX_BOARDS_PER_PAGE = 1;

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

function mapOffer(
  raw: unknown,
  company: string,
  attribution: string,
): IngestJobDraft | null {
  const j = asRecord(raw);
  if (!j) return null;

  const jobId =
    (typeof j.id === "number" && Number.isFinite(j.id)
      ? String(Math.floor(j.id))
      : str(j.id, 40).trim()) || str(j.slug, 80).trim();
  if (!jobId) return null;

  const title = str(j.title, 300).trim();
  if (!title) return null;

  const location =
    str(j.location, 200) ||
    str(j.city, 80) ||
    str(asRecord(j.location)?.city, 80) ||
    "Remote";

  const applyRaw =
    str(j.careers_url, 2000) ||
    str(j.careers_apply_url, 2000) ||
    str(j.url, 2000) ||
    `https://${company}.recruitee.com/o/${encodeURIComponent(str(j.slug, 80) || jobId)}`;
  const externalUrl = normalizeJobUrl(applyRaw) || applyRaw || null;

  const desc =
    stripHtml(str(j.description, 200_000)) ||
    stripHtml(str(j.requirements, 100_000)) ||
    title;

  const remote =
    Boolean(j.remote) ||
    /remote/i.test(String(location)) ||
    /remote/i.test(title);

  const tags = asArray(j.tags)
    .map((t) => str(t, 40).trim())
    .filter(Boolean);

  return {
    sourceKey: "recruitee",
    sourceJobId: `${company}:${jobId}`,
    externalId: `recruitee:${company}:${jobId}`,
    title,
    company,
    location: String(location).slice(0, 200),
    description: desc,
    descriptionIsSnippet: desc === title,
    applyUrl: externalUrl,
    externalUrl,
    remote,
    employmentType: str(j.employment_type, 40) || "full-time",
    tags,
    skills: [],
    publishedAt: toDate(j.published_at) || toDate(j.created_at),
    attribution,
  };
}

export const recruiteeAdapter: JobSourceAdapter = {
  key: "recruitee",
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

    if (!tryAcquireSourceQuota("recruitee", rateLimit)) {
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
      const url = OFFERS_API(company);
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

      const root = asRecord(data);
      const list = asArray(root?.offers).length
        ? asArray(root?.offers)
        : asArray(data);

      fetched += list.length;
      for (const item of list) {
        const draft = mapOffer(item, company, attribution);
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
