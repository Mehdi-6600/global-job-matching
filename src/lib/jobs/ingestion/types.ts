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
 * Pagination modes supported by the central pipeline.
 *
 *  - "page"   → adapter yields page numbers (page=1,2,3,…)
 *  - "cursor" → adapter yields an opaque nextCursor token
 *  - "token"  → same as cursor; kept separate for semantic clarity
 *  - "single" → adapter returns everything in one call (no pagination)
 *
 * Adapters declare which mode they use. The pipeline handles all modes
 * uniformly; this declaration is for validation, metrics, and future
 * loop-protection logic.
 */
export type PaginationMode = "page" | "cursor" | "token" | "single";

/**
 * Optional capability declaration for a source adapter.
 *
 * Adapters MAY declare which features their source actually provides.
 * The pipeline never assumes a capability; missing declarations fall
 * back to permissive behavior (accept whatever the adapter returns).
 *
 * This is intentionally a *soft* declaration, not an enforcement layer:
 *  - If a capability is declared `false`, the pipeline may skip costly
 *    checks that would otherwise be wasted (future optimization).
 *  - If a capability is undeclared, the pipeline behaves as before.
 */
export type SourceCapabilities = {
  /** How the adapter paginates. Defaults to "page" if undeclared. */
  readonly pagination?: PaginationMode;
  /** Adapter produces a stable, source-scoped identifier. */
  readonly providesExternalId?: boolean;
  /** Adapter produces an external detail URL. */
  readonly providesExternalUrl?: boolean;
  /** Adapter produces an apply URL distinct from external URL. */
  readonly providesApplyUrl?: boolean;
  /** Adapter produces structured salary info. */
  readonly providesSalary?: boolean;
  /** Adapter produces a remote flag. */
  readonly providesRemote?: boolean;
  /** Adapter produces a published timestamp. */
  readonly providesPublishedAt?: boolean;
  /** Adapter produces a source-side updated timestamp. */
  readonly providesSourceUpdatedAt?: boolean;
  /** Adapter produces a company name. */
  readonly providesCompany?: boolean;
  /** Adapter produces a non-empty location. */
  readonly providesLocation?: boolean;
  /** Adapter produces an employment type. */
  readonly providesEmploymentType?: boolean;
  /** Adapter produces a meaningful description (not just title). */
  readonly providesDescription?: boolean;
};

/**
 * Optional per-source HTTP tuning.
 *
 * Declared on the registry entry, passed to the adapter via
 * `AdapterFetchOptions.sourceConfig`. Adapters that ignore it still
 * work (they just use their own defaults).
 */
export type SourceHttpConfig = {
  /** Max ms for a single HTTP attempt (adapter default: 12_000). */
  readonly timeoutMs?: number;
  /** Max retry attempts for a single fetch (adapter default: 3). */
  readonly maxAttempts?: number;
  /**
   * Max bytes for a single response body.
   * If content-length exceeds this, the response is rejected before reading.
   * If the body exceeds this despite missing/lying content-length, it is truncated.
   */
  readonly maxResponseBytes?: number;
};

/**
 * Snapshot of source configuration passed to the adapter at fetch time.
 * Adapters may read these values but must remain functional if any are
 * missing (they should fall back to their own internal defaults).
 */
export type AdapterSourceConfig = {
  readonly key: string;
  readonly name: string;
  readonly language?: string;
  readonly rateLimitPerMinute?: number | null;
  readonly httpConfig?: SourceHttpConfig;
};

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
  /**
   * Optional per-source configuration (language, HTTP tuning, …).
   * Adapters should treat any missing field as "use my own default".
   */
  readonly sourceConfig?: AdapterSourceConfig;
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
