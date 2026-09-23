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
 * Lever public postings adapter.
 *
 * Endpoint (public, per site):
 *   https://api.lever.co/v0/postings/<site>?mode=json
 *
 * Response shape: a JSON array of postings:
 *   [
 *     {
 *       "id": "abc-123",
 *       "text": "Senior Engineer",
 *       "hostedUrl": "https://jobs.lever.co/acme/abc-123",
 *       "applyUrl": "https://jobs.lever.co/acme/abc-123/apply",
 *       "createdAt": 1700000000000,
 *       "categories": {
 *         "location": "Berlin",
 *         "team": "Engineering",
 *         "commitment": "Full-time"
 *       },
 *       "description": "<p>...</p>",
 *       "descriptionPlain": "...",
 *       "lists": [ { "text": "Requirements", "content": "<ul>...</ul>" } ]
 *     }
 *   ]
 *
 * Identity:
 *   sourceJobId = "<site>:<id>"
 *   externalId  = "lever:<site>:<id>"
 *
 * LEGAL STATUS — TO BE DETERMINED BY PROJECT OWNER.
 * Registry entry ships DISABLED. Boards must additionally be approved
 * in the SourceCompany table before the adapter will fetch them.
 */

const PROVIDER: AtsProvider = "lever";
const SITE_API = (site: string) =>
  `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 15_000_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_ATTRIBUTION = "Jobs via Lever";
const DEFAULT_SITES_PER_PAGE = 25;

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
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Lever has no top-level "company" field in the postings payload —
 * the site slug is the company identity. The board's companyName in
 * SourceCompany is authoritative.
 */
function mapPosting(
  raw: unknown,
  site: string,
  attribution: string,
): IngestJobDraft | null {
  const j = asRecord(raw);
  if (!j) return null;

  const rawId = j.id;
  const id =
    typeof rawId === "string"
      ? rawId.trim().slice(0, 200)
      : typeof rawId === "number" && Number.isFinite(rawId)
        ? String(Math.floor(rawId))
        : "";
  if (!id) return null;

  const title = str(j.text, 300).trim();
  if (!title) return null;

  const categories = asRecord(j.categories);
  const location = categories
    ? str(categories.location, 200).trim() || "Remote"
    : "Remote";
  const commitment = categories ? str(categories.commitment, 60).trim() : "";
  const team = categories ? str(categories.team, 80).trim() : "";

  // Prefer descriptionPlain (no HTML) when present, else strip HTML.
  const plain = str(j.descriptionPlain, 200_000).trim();
  const rawHtml = str(j.description, 200_000);
  const description = plain || stripHtml(rawHtml) || title;

  const hostedUrl = str(j.hostedUrl, 2000).trim();
  const applyField = str(j.applyUrl, 2000).trim();
  const externalUrl = normalizeJobUrl(hostedUrl) || (hostedUrl || null);
  const applyUrl = normalizeJobUrl(applyField) || externalUrl;

  const tags = [team, commitment].filter(Boolean);

  const remote = /remote/i.test(location);

  return {
    sourceKey: "lever",
    sourceJobId: `${site}:${id}`,
    externalId: `lever:${site}:${id}`,
    title,
    company: site,
    location,
    description,
    descriptionIsSnippet: false,
    applyUrl,
    externalUrl,
    remote,
    employmentType: commitment || "full-time",
    tags,
    skills: [],
    publishedAt: toDate(j.createdAt),
    attribution,
  };
}

export const leverAdapter: JobSourceAdapter = {
  key: "lever",
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
      Math.max(1, options.perPage ?? DEFAULT_SITES_PER_PAGE),
      DEFAULT_SITES_PER_PAGE,
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
      if (!tryAcquireSourceQuota("lever", rateLimit)) {
        errors.push("rate_limited");
        break;
      }

      const url = SITE_API(board.boardIdentifier);
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

      const list = Array.isArray(data) ? data : [];
      fetched += list.length;

      for (const item of list) {
        const draft = mapPosting(item, board.boardIdentifier, attribution);
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
