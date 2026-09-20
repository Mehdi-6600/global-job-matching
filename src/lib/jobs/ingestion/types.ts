/**
 * Job Ingestion Network — shared types.
 *
 * Priority order (strict):
 *   LEGAL > QUALITY > FRESHNESS > COVERAGE > RAW VOLUME
 */

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
  | "ARCHIVED"
  | "fresh"
  | "aging"
  | "stale"
  | "expired"
  | "archived";

export type SyncCompleteness = "FULL" | "PARTIAL" | "FAILED";

/**
 * Normalized record produced by any adapter before central persist.
 * Draft fields are immutable once constructed by the adapter.
 */
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

export type DedupLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DedupMatch = {
  readonly jobId: string;
  readonly confidence: number;
  readonly level: DedupLevel;
  readonly reason: string;
};

/** Result of the quality gate before persist. */
export type QualityResult = {
  ok: boolean;
  score: number;
  reasons: string[];
};

/**
 * Mutable run counters — pipeline increments these during a sync.
 * Do NOT mark counter fields as readonly.
 *
 * `leaseLost` is distinct from `timedOut`:
 *   - `timedOut`   → run stopped because the global time budget ran out
 *   - `leaseLost`  → run stopped because the source lease could not be renewed
 *                    (ownership no longer confirmed by the database)
 *
 * Both produce `completeness: "PARTIAL"` and are safe to resume later,
 * but they must be reported separately for diagnostics.
 */
export type IngestStats = {
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
  leaseLost?: boolean;
  completeness: SyncCompleteness;
  errors: string[];
};
