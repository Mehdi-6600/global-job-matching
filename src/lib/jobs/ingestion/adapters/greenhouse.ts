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
 * Greenhouse public job board adapter.
 *
 * Endpoint (public, per board):
 *   https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true
 *
 * Identity:
 *   sourceJobId = "<board>:<jobId>"
 *   externalId  = "greenhouse:<board>:<jobId>"
 *
 * Rate limit:
 *   tryAcquireSourceQuota is called ONCE per fetchPage, not per board.
 *   With MAX_BOARDS_PER_PAGE=1 each page is one board (fits Vercel Hobby).
 *   Individual board failures are recorded but do not abort the page.
 */

const PROVIDER: AtsProvider = "greenhouse";
const BOARD_API = (board: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    board,
  )}/jobs?content=true`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Greenhouse";

/**
 * Boards per fetchPage.
 *
 * MUST stay at 1 on Vercel Hobby (~60s limit). Packing all boards into one
 * page produced ~1400 drafts; pipeline timed out after ~484 Stripe updates
 * (PARTIAL) and never persisted figma/coinbase/discord/reddit/airbnb/notion.
 * One board per page → hasMore advances → checkpoint → next board next page.
 */
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
  board: string,
  attribution: string,
): IngestJobDraft | null {
  const j = asRecord(raw);
  if (!j) return null;

  const rawId = j.id;
  const jobId =
    typeof rawId === "number" && Number.isFinite(rawId)
      ? String(Math.floor(rawId))
      : str(rawId, 40).trim();
  if (!jobId) return null;

  const title = str(j.title, 300).trim();
  if (!title) return null;

  const locRec = asRecord(j.location);
  const location = locRec
    ? str(locRec.name, 200).trim() || "Remote"
    : "Remote";

  const absoluteUrl = str(j.absolute_url, 2000).trim();
  const externalUrl = normalizeJobUrl(absoluteUrl) || (absoluteUrl || null);

  const rawHtml = str(j.content, 200_000);
  const description = stripHtml(rawHtml) || title;

  const departments = asArray(j.departments)
    .map((d) => str(asRecord(d)?.name, 80).trim())
    .filter(Boolean);
  const offices = asArray(j.offices)
    .map((o) => str(asRecord(o)?.name, 80).trim())
    .filter(Boolean);
  const tags = Array.from(new Set([...departments, ...offices]));

  const remote = /remote/i.test(location);

  return {
    sourceKey: "greenhouse",
    sourceJobId: `${board}:${jobId}`,
    externalId: `greenhouse:${board}:${jobId}`,
    title,
    company: board,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl: externalUrl,
    externalUrl,
    remote,
    employmentType: "full-time",
    tags,
    skills: [],
    publishedAt: toDate(j.updated_at),
    attribution,
  };
}

export const greenhouseAdapter: JobSourceAdapter = {
  key: "greenhouse",
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

    /*
     * ONE quota grant per fetchPage. Pipeline calls fetchPage repeatedly
     * (page 1, 2, 3, ...); each call gets a fresh grant. Boards within
     * a single page share that grant — no per-board quota consumption.
     */
    if (!tryAcquireSourceQuota("greenhouse", rateLimit)) {
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
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [],
        nextCursor: null,
      };
    }

    const start = (page - 1) * perPage;
    const slice = boards.slice(start, start + perPage);
    const hasMore = start + slice.length < boards.length;

    if (slice.length === 0) {
      return {
        jobs: [],
        hasMore: false,
        fetched: 0,
        errors: [],
        nextCursor: null,
      };
    }

    const drafts: IngestJobDraft[] = [];
    const errors: string[] = [];
    let fetched = 0;

    for (const board of slice) {
      const url = BOARD_API(board.boardIdentifier);
      const result = await fetchWithRetry(url, {
        signal: options.signal,
        timeoutMs,
        maxAttempts,
        maxResponseBytes,
      });

      if (!result.ok) {
        const err = result.error || `http_${result.status}`;
        errors.push(`board:${board.boardIdentifier}:${err}`);
        await recordBoardCheck(PROVIDER, board.boardIdentifier, {
          ok: false,
          error: err,
        });
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(result.body);
      } catch {
        errors.push(`board:${board.boardIdentifier}:malformed_json`);
        await recordBoardCheck(PROVIDER, board.boardIdentifier, {
          ok: false,
          error: "malformed_json",
        });
        continue;
      }

      const list = asArray(asRecord(data)?.jobs);
      fetched += list.length;

      for (const item of list) {
        const draft = mapJob(item, board.boardIdentifier, attribution);
        if (!draft) continue;
        drafts.push({ ...draft, company: board.companyName || draft.company });
      }

      await recordBoardCheck(PROVIDER, board.boardIdentifier, { ok: true });
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
