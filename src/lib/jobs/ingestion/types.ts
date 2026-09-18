/**
 * Job Ingestion Network — shared types.
 *
 * Priority order (strict):
 *   LEGAL > QUALITY > FRESHNESS > COVERAGE > RAW VOLUME
 *
 * Any adapter, validator, deduplicator, or persister MUST respect this order.
 */

/* -------------------------------------------------------------------------- */
/*                              Source governance                             */
/* -------------------------------------------------------------------------- */

/**
 * Legal / licensing status of a source.
 * A source that is not APPROVED must never be fetched at full capacity.
 */
export type LicenseStatus =
  | "APPROVED"
  | "NEEDS_PERMISSION"
  | "RESTRICTED"
  | "DISABLED"
  | "UNKNOWN";

/**
 * Operational health of a source as observed by the ingestion network.
 */
export type SourceHealth =
  | "HEALTHY"
  | "DEGRADED"
  | "FAILING"
  | "DISABLED"
  | "UNKNOWN";

/**
 * Freshness bucket of a job posting.
 */
export type FreshnessStatus =
  | "FRESH"
  | "AGING"
  | "STALE"
  | "EXPIRED"
  | "ARCHIVED";

/**
 * How complete a sync run was for a given source.
 */
export type SyncCompleteness = "FULL" | "PARTIAL" | "FAILED";

/* -------------------------------------------------------------------------- */
/*                                Ingest drafts                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalized record produced by any adapter before central persist.
 *
 * Contract:
 * - `sourceKey` + `sourceJobId` MUST be stable and unique per source.
 * - `externalId` is the canonical cross-source identifier when available.
 * - `descriptionIsSnippet` MUST be true if `description` is not the full text.
 * - At least one of `applyUrl` / `externalUrl` SHOULD be present.
 */
export type IngestJobDraft = {
  /** Stable key of the source adapter (e.g. "greenhouse", "lever"). */
  readonly sourceKey: string;

  /** Source-local job id. Stable within the source. */
  readonly sourceJobId: string;

  /** Canonical external id, if the source exposes one. */
  readonly externalId: string;

  readonly title: string;
  readonly company: string;
  readonly location: string;

  /** Job description text. May be a snippet — see `descriptionIsSnippet`. */
  readonly description: string;

  /** True when `description` is a snippet and not the full posting. */
  readonly descriptionIsSnippet: boolean;

  /** Direct application URL. Null when unknown or not permitted. */
  readonly applyUrl: string | null;

  /** Canonical external URL for the posting. Null when unknown. */
  readonly externalUrl: string | null;

  readonly remote: boolean;

  /** Normalized employment type (e.g. "FULL_TIME", "CONTRACT"). */
  readonly employmentType: string;

  readonly salaryMin?: number | null;
  readonly salaryMax?: number | null;
  readonly currency?: string | null;
  readonly salaryText?: string | null;

  readonly tags: readonly string[];
  readonly skills: readonly string[];

  readonly publishedAt?: Date | null;
  readonly sourceUpdatedAt?: Date | null;
  readonly expiresAt?: Date | null;

  /** Required attribution string when the source license demands it. */
  readonly attribution?: string | null;

  /** Original raw payload for auditing / re-parsing. Never trusted directly. */
  readonly raw?: unknown;
};

/* -------------------------------------------------------------------------- */
/*                              Adapter contract                              */
/* -------------------------------------------------------------------------- */

export type AdapterFetchOptions = {
  readonly page?: number;
  readonly perPage?: number;
  readonly cursor?: string | null;
  readonly signal?: AbortSignal;
};

export type AdapterFetchResult = {
  readonly jobs: readonly IngestJobDraft[];
  readonly nextCursor?: string | null;
  readonly hasMore: boolean;
  readonly fetched: number;
  readonly errors: readonly string[];
};

/**
 * Every source must implement this contract.
 * Adapters MUST NOT perform persistence, dedup, or quality decisions.
 */
export type JobSourceAdapter = {
  readonly key: string;
  fetchPage(options?: AdapterFetchOptions): Promise<AdapterFetchResult>;
};

/* -------------------------------------------------------------------------- */
/*                                  Dedup                                     */
/* -------------------------------------------------------------------------- */

/**
 * Dedup confidence level.
 * 1 = exact match, 6 = weakest heuristic match.
 */
export type DedupLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DedupMatch = {
  readonly jobId: string;
  /** 0..1 confidence score. */
  readonly confidence: number;
  readonly level: DedupLevel;
  readonly reason: string;
};

/* -------------------------------------------------------------------------- */
/*                                Ingest stats                                */
/* -------------------------------------------------------------------------- */

export type IngestStats = {
  readonly sourceKey: string;

  /** ISO-8601 timestamps. */
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;

  readonly fetched: number;
  readonly validated: number;
  readonly created: number;
  readonly updated: number;
  readonly duplicates: number;
  readonly skipped: number;
  readonly qualityRejected: number;
  readonly failed: number;

  readonly timedOut: boolean;
  readonly completeness: SyncCompleteness;
  readonly errors: readonly string[];
};
