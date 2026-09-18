/**
 * Job Ingestion Network — shared types.
 *
 * Priority order (strict):
 *   LEGAL > QUALITY > FRESHNESS > COVERAGE > RAW VOLUME
 */

/* -------------------------------------------------------------------------- */
/*                              Source governance                             */
/* -------------------------------------------------------------------------- */

export type LicenseStatus =
  | "APPROVED"
  | "NEEDS_PERMISSION"
  | "RESTRICTED"
  | "DISABLED"
  | "UNKNOWN";

export type SourceHealth =
  | "HEALTHY"
  | "DEGRADED"
  | "FAILING"
  | "DISABLED"
  | "UNKNOWN";

export type FreshnessStatus =
  | "FRESH"
  | "AGING"
  | "STALE"
  | "EXPIRED"
  | "ARCHIVED";

export type SyncCompleteness = "FULL" | "PARTIAL" | "FAILED";

/* -------------------------------------------------------------------------- */
/*                                Ingest drafts                               */
/* -------------------------------------------------------------------------- */

export type IngestJobDraft = {
  readonly sourceKey: string;
  readonly sourceJobId: string;
  readonly externalId: string;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly description: string;
  readonly descriptionIsSnippet: boolean;
  readonly applyUrl: string | null;
  readonly externalUrl: string | null;
  readonly remote: boolean;
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
  readonly attribution?: string | null;
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

export type JobSourceAdapter = {
  readonly key: string;
  fetchPage(options?: AdapterFetchOptions): Promise<AdapterFetchResult>;
};

/* -------------------------------------------------------------------------- */
/*                                  Dedup                                     */
/* -------------------------------------------------------------------------- */

export type DedupLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DedupMatch = {
  readonly jobId: string;
  readonly confidence: number;
  readonly level: DedupLevel;
  readonly reason: string;
};

/* -------------------------------------------------------------------------- */
/*                                Ingest stats                                */
/* -------------------------------------------------------------------------- */

/**
 * Mutable accumulator used ONLY inside the pipeline while a sync is running.
 */
export type IngestStatsAccumulator = {
  sourceKey: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  fetched: number;
  validated: number;
  created: number;
  updated: number;
  duplicates: number;
  skipped: number;
  qualityRejected: number;
  failed: number;
  timedOut: boolean;
  completeness: SyncCompleteness;
  errors: string[];
};

/**
 * Immutable snapshot of a completed sync.
 */
export type IngestStats = Readonly<IngestStatsAccumulator>;
