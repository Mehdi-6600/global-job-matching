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
 * Workable public widget/accounts adapter.
 *
 * Endpoint (public):
 *   GET https://apply.workable.com/api/v1/widget/accounts/{subdomain}
 * Optional details:
 *   GET https://www.workable.com/api/accounts/{subdomain}?details=true
 *
 * Identity:
 *   sourceJobId = "<subdomain>:<shortcode|id>"
 *   externalId  = "workable:<subdomain>:<shortcode|id>"
 *
 * Same legal model as Greenhouse public board JSON. APPROVED boards only.
 * ONE board per fetchPage for Vercel Hobby.
 */

const PROVIDER = "workable" as AtsProvider;
const WIDGET_API = (subdomain: string) =>
  `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(
    subdomain,
  )}`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 8_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Workable";
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

function mapJob(
  raw: unknown,
  subdomain: string,
  attribution: string,
): IngestJobDraft | null {
  const j = asRecord(raw);
  if (!j) return null;

  const jobId =
    str(j.shortcode, 80).trim() ||
    str(j.id, 80).trim() ||
    str(j.uuid, 80).trim();
  if (!jobId) return null;

  const title = str(j.title, 300).trim();
  if (!title) return null;

  const location =
    str(j.city, 80) ||
    str(j.location, 200) ||
    str(asRecord(j.location)?.city, 80) ||
    "Remote";

  const applyRaw =
    str(j.url, 2000) ||
    str(j.application_url, 2000) ||
    `https://apply.workable.com/${encodeURIComponent(subdomain)}/j/${encodeURIComponent(jobId)}`;
  const externalUrl = normalizeJobUrl(applyRaw) || applyRaw || null;

  const desc =
    stripHtml(str(j.description, 200_000)) ||
    stripHtml(str(j.full_description, 200_000)) ||
    title;

  const remote =
    Boolean(j.remote) ||
    /remote/i.test(location) ||
    /remote/i.test(title);

  return {
    sourceKey: "workable",
    sourceJobId: `${subdomain}:${jobId}`,
    externalId: `workable:${subdomain}:${jobId}`,
    title,
    company: subdomain,
    location: String(location).slice(0, 200) || "Remote",
    description: desc,
    descriptionIsSnippet: desc === title,
    applyUrl: externalUrl,
    externalUrl,
    remote,
    employmentType: str(j.employment_type, 40) || str(j.type, 40) || "full-time",
    tags: [],
    skills: [],
    publishedAt: toDate(j.published_on) || toDate(j.created_at),
    attribution,
  };
}

export const workableAdapter: JobSourceAdapter = {
  key: "workable",
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

    if (!tryAcquireSourceQuota("workable", rateLimit)) {
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
      const subdomain = board.boardIdentifier;
      const url = WIDGET_API(subdomain);
      const result = await fetchWithRetry(url, {
        signal: options.signal,
        timeoutMs,
        maxAttempts,
        maxResponseBytes,
      });

      if (!result.ok) {
        const err = result.error || `http_${result.status}`;
        errors.push(`board:${subdomain}:${err}`);
        await recordBoardCheck(PROVIDER, subdomain, { ok: false, error: err });
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(result.body);
      } catch {
        errors.push(`board:${subdomain}:malformed_json`);
        await recordBoardCheck(PROVIDER, subdomain, {
          ok: false,
          error: "malformed_json",
        });
        continue;
      }

      const root = asRecord(data);
      const list = asArray(root?.jobs).length
        ? asArray(root?.jobs)
        : asArray(root?.results);

      fetched += list.length;
      for (const item of list) {
        const draft = mapJob(item, subdomain, attribution);
        if (!draft) continue;
        drafts.push({
          ...draft,
          company: board.companyName || draft.company,
        });
      }

      await recordBoardCheck(PROVIDER, subdomain, { ok: true });
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
