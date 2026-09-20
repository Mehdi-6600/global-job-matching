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

export type RobotsStatus = "allowed" | "disallowed" | "unknown";
export type TermsStatus = "allowed" | "restricted" | "unknown";

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

export type PaginationMode = "page" | "cursor" | "token" | "single";

export type SourceCapabilities = {
  readonly pagination?: PaginationMode;
  readonly providesExternalId?: boolean;
  readonly providesExternalUrl?: boolean;
  readonly providesApplyUrl?: boolean;
  readonly providesSalary?: boolean;
  readonly providesRemote?: boolean;
  readonly providesPublishedAt?: boolean;
  readonly providesSourceUpdatedAt?: boolean;
  readonly providesCompany?: boolean;
  readonly providesLocation?: boolean;
  readonly providesEmploymentType?: boolean;
  readonly providesDescription?: boolean;
};

export type SourceHttpConfig = {
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly maxResponseBytes?: number;
};

export type AdapterSourceConfig = {
  readonly key: string;
  readonly name: string;
  readonly language?: string;
  readonly rateLimitPerMinute?: number | null;
  readonly httpConfig?: SourceHttpConfig;
  readonly attribution?: string | null;
};

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

export type QualityResult = {
  ok: boolean;
  score: number;
  reasons: string[];
};

/**
 * Mutable run counters — pipeline increments these during a sync.
 * Do NOT mark counter fields as readonly.
 *
 * `runId` is a per-source, per-run correlation id used only for logs
 * and diagnostics. It is NOT persisted to the database.
 */
export type IngestStats = {
  sourceKey: string;
  /** Per-run correlation id (not persisted; logs only). */
  runId: string;
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
