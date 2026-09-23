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
 * Ashby public job board adapter.
 *
 * Endpoint (public, per board):
 *   https://api.ashbyhq.com/posting-api/job-board/<board>
 *
 * Response shape (public, at time of writing):
 *   {
 *     "jobs": [
 *       {
 *         "id": "uuid",
 *         "title": "...",
 *         "location": "...",
 *         "employmentType": "FullTime",
 *         "department": "Engineering",
 *         "team": "Platform",
 *         "isListed": true,
 *         "isRemote": true,
 *         "publishedAt": "2024-01-01T12:00:00.000Z",
 *         "jobUrl": "https://jobs.ashbyhq.com/<board>/<uuid>",
 *         "applyUrl": "https://jobs.ashbyhq.com/<board>/<uuid>/application",
 *         "descriptionHtml": "<p>...</p>",
 *         "descriptionPlain": "..."
 *       }
 *     ]
 *   }
 *
 * IMPORTANT — isListed:
 *   Ashby distinguishes listed (public) jobs from unlisted (draft,
 *   internal, or otherwise not intended for public display) jobs.
 *   This adapter ONLY ingests jobs where isListed === true. Anything
 *   else is dropped. This is a hard rule, matching §7 of the project
 *   brief.
 *
 * Identity:
 *   sourceJobId = "<board>:<id>"
 *   externalId  = "ashby:<board>:<id>"
 *
 * LEGAL STATUS — TO BE DETERMINED BY PROJECT OWNER.
 * Registry entry ships DISABLED. Boards must additionally be approved
 * in the SourceCompany table before the adapter will fetch them.
 */

const PROVIDER: AtsProvider = "ashby";
const BOARD_API = (board: string) =>
  `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Ashby";
const DEFAULT_BOARDS_PER_PAGE = 25;

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
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
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

  // Hard rule: only listed jobs. Unlisted/draft never enter the system.
  if (j.isListed !== true) return null;

  const id = str(j.id, 200).trim();
  const title = str(j.title, 300).trim();
  if (!id || !title) return null;

  const location = str(j.location, 200).trim() || "Remote";
  const employmentType = str(j.employmentType, 60).trim() || "full-time";
  const department = str(j.department, 80).trim();
  const team = str(j.team, 80).trim();

  const plain = str(j.descriptionPlain, 200_000).trim();
  const rawHtml = str(j.descriptionHtml, 200_000);
  const description = plain || stripHtml(rawHtml) || title;

  const jobUrl = str(j.jobUrl, 2000).trim();
  const applyField = str(j.applyUrl, 2000).trim();
  const externalUrl = normalizeJobUrl(jobUrl) || (jobUrl || null);
  const applyUrl = normalizeJobUrl(applyField) || externalUrl;

  const tags = [department, team].filter(Boolean);
  const remote = j.isRemote === true || /remote/i.test(location);

  return {
    sourceKey: "ashby",
    sourceJobId: `${board}:${id}`,
    externalId: `ashby:${board}:${id}`,
    title,
    company: board,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl,
    externalUrl,
    remote,
    employmentType,
    tags,
    skills: [],
    publishedAt: toDate(j.publishedAt),
    attribution,
  };
}

export const ashbyAdapter: JobSourceAdapter = {
  key: "ashby",
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

    const perPage = Math.min(
      Math.max(1, options.perPage ?? DEFAULT_BOARDS_PER_PAGE),
      DEFAULT_BOARDS_PER_PAGE,
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
      if (!tryAcquireSourceQuota("ashby", rateLimit)) {
        errors.push("rate_limited");
        break;
      }

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
