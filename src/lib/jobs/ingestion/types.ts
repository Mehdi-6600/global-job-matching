/**
 * Job Ingestion Network — shared types.
 * LEGAL > QUALITY > FRESHNESS > COVERAGE > RAW VOLUME
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
  | "ARCHIVED";

export type SyncCompleteness = "FULL" | "PARTIAL" | "FAILED";

/** Normalized record produced by any adapter before central persist. */
export type IngestJobDraft = {
  sourceKey: string;
  sourceJobId: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  descriptionIsSnippet: boolean;
  applyUrl: string | null;
  externalUrl: string | null;
  remote: boolean;
  employmentType: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  salaryText?: string | null;
  tags: string[];
  skills: string[];
  publishedAt?: Date | null;
  sourceUpdatedAt?: Date | null;
  expiresAt?: Date | null;
  attribution?: string | null;
  raw?: unknown;
};

export type AdapterFetchOptions = {
  page?: number;
  perPage?: number;
  cursor?: string | null;
  signal?: AbortSignal;
};

export type AdapterFetchResult = {
  jobs: IngestJobDraft[];
  nextCursor?: string | null;
  hasMore: boolean;
  fetched: number;
  errors: string[];
};

export type JobSourceAdapter = {
  key: string;
  fetchPage(options?: AdapterFetchOptions): Promise<AdapterFetchResult>;
};

export type DedupMatch = {
  jobId: string;
  confidence: number;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  reason: string;
};

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
  completeness: SyncCompleteness;
  errors: string[];
};
