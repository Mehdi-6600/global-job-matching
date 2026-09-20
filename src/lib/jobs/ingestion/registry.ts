/**
 * Static defaults + DB as runtime Source of Truth for enablement/license.
 *
 * The registry is the single source of truth for which adapters exist.
 * A new source = one adapter file + one registry entry. The pipeline
 * resolves adapters through this registry (no separate ADAPTERS map).
 *
 * Legal gate (isProductionIngestAllowed) is fail-closed:
 *   1. enabled                  — runtime kill switch
 *   2. licenseStatus APPROVED   — licensing/permission to ingest
 *   3. robotsStatus ALLOWED     — explicit robots.txt review
 *   4. termsStatus ALLOWED      — explicit ToS review
 *
 * Any missing or non-ALLOWED value blocks the source. "UNKNOWN" is NOT
 * a synonym for "allowed": a new source must be reviewed and explicitly
 * marked allowed before it can run in production.
 */
import { db } from "@/lib/db";
import type {
  JobSourceAdapter,
  LicenseStatus,
  RobotsStatus,
  SourceCapabilities,
  SourceHttpConfig,
  TermsStatus,
} from "./types";
import { arbeitnowAdapter } from "./adapters/arbeitnow";

export type SourceRegistryEntry = {
  key: string;
  name: string;
  type: string;
  baseUrl: string;
  apiUrl?: string;
  licenseStatus: LicenseStatus;
  commercialAllowed: boolean;
  redistributionAllowed: boolean;
  attributionRequired: boolean;
  /**
   * Human-readable attribution string written into imported Job rows
   * (Job.attribution). If omitted, jobs from this source carry no
   * attribution string even if attributionRequired is true — this is
   * allowed but discouraged; prefer to always set it.
   */
  attribution?: string;
  /**
   * Robots.txt posture. MUST be explicitly set to "allowed" (after a
   * manual review of the source's robots.txt for the paths the adapter
   * actually fetches) before the source can run in production. Missing
   * or "unknown" is treated as blocked.
   */
  robotsStatus?: RobotsStatus;
  /**
   * Terms-of-service posture. MUST be explicitly set to "allowed" (after
   * a manual review of the source's terms for automated ingestion)
   * before the source can run in production. Missing or "unknown" is
   * treated as blocked.
   */
  termsStatus?: TermsStatus;
  enabled: boolean;
  refreshIntervalMinutes: number;
  rateLimitPerMinute?: number | null;
  notes: string;

  /** ISO 639-1 language code of the source content (e.g. "en", "de"). */
  language?: string;

  /** Optional per-source HTTP tuning passed to the adapter. */
  httpConfig?: SourceHttpConfig;

  /**
   * Adapter implementation for this source.
   *
   * Declared here (not in a separate ADAPTERS map) so adding a new
   * source is a single-file change: create the adapter, add a registry
   * entry with the adapter reference, done.
   */
  adapter?: JobSourceAdapter;

  /**
   * Optional capability declaration. The pipeline uses it to pick the
   * right pagination strategy and to validate the adapter's behavior.
   */
  capabilities?: SourceCapabilities;

  /** Runtime health fields from JobSource (optional) */
  consecutiveFailures?: number;
  lastErrorAt?: Date | null;
};

export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    key: "arbeitnow",
    name: "Arbeitnow",
    type: "job_board",
    baseUrl: "https://www.arbeitnow.com",
    apiUrl: "https://www.arbeitnow.com/api/job-board-api",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Arbeitnow",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 30,
    notes: "Existing production source. Legal re-verification recommended.",
    language: "en",
    httpConfig: {
      timeoutMs: 12_000,
      maxAttempts: 3,
      maxResponseBytes: 10_000_000,
    },
    adapter: arbeitnowAdapter,
    capabilities: {
      pagination: "page",
      providesExternalId: true,
      providesExternalUrl: true,
      providesApplyUrl: true,
      providesSalary: false,
      providesRemote: true,
      providesPublishedAt: true,
      providesSourceUpdatedAt: false,
      providesCompany: true,
      providesLocation: true,
      providesEmploymentType: true,
      providesDescription: true,
    },
  },
];

/**
 * Legal gate for production ingestion — FAIL-CLOSED.
 *
 * A source is allowed to run only when ALL of the following hold:
 *   - enabled === true
 *   - licenseStatus === "APPROVED"
 *   - robotsStatus === "allowed"
 *   - termsStatus === "allowed"
 *
 * Missing (undefined) or "unknown" is treated as NOT allowed. This
 * intentionally rejects sources that have not been reviewed — a new
 * adapter must set both robotsStatus and termsStatus explicitly after
 * a manual review.
 */
export function isProductionIngestAllowed(
  entry: Pick<
    SourceRegistryEntry,
    "enabled" | "licenseStatus" | "robotsStatus" | "termsStatus"
  >,
): boolean {
  if (!entry.enabled) return false;
  if (entry.licenseStatus !== "APPROVED") return false;
  if (entry.robotsStatus !== "allowed") return false;
  if (entry.termsStatus !== "allowed") return false;
  return true;
}

/**
 * Human-readable reason a source is blocked, or null when allowed.
 * Used by the pipeline to record a specific error code.
 *
 * Error taxonomy (stable strings):
 *   source_disabled
 *   license_blocked:<status>
 *   robots_blocked:<status-or-missing>
 *   terms_blocked:<status-or-missing>
 */
export function ingestBlockReason(
  entry: Pick<
    SourceRegistryEntry,
    "enabled" | "licenseStatus" | "robotsStatus" | "termsStatus"
  >,
): string | null {
  if (!entry.enabled) return "source_disabled";
  if (entry.licenseStatus !== "APPROVED") {
    return `license_blocked:${entry.licenseStatus}`;
  }
  if (entry.robotsStatus !== "allowed") {
    return `robots_blocked:${entry.robotsStatus ?? "missing"}`;
  }
  if (entry.termsStatus !== "allowed") {
    return `terms_blocked:${entry.termsStatus ?? "missing"}`;
  }
  return null;
}

/** Static-only enabled list (no DB). Prefer getRunnableSources() at runtime. */
export function getEnabledSources(): SourceRegistryEntry[] {
  return SOURCE_REGISTRY.filter(isProductionIngestAllowed);
}

/**
 * Upsert static registry into JobSource table (idempotent).
 * Does not override DB licenseStatus/enabled once row exists — only fills missing.
 * To hard-sync defaults, pass forceDefaults=true (admin use).
 *
 * Note: robotsStatus / termsStatus / attribution live only in the static
 * registry (not in the DB schema) — they are policy metadata, not runtime
 * state, and are intentionally not persisted to JobSource.
 */
export async function ensureSourcesInDb(
  forceDefaults = false,
): Promise<void> {
  for (const s of SOURCE_REGISTRY) {
    const existing = await db.jobSource.findUnique({ where: { key: s.key } });
    if (!existing) {
      await db.jobSource.create({
        data: {
          key: s.key,
          name: s.name,
          type: s.type,
          baseUrl: s.baseUrl,
          apiUrl: s.apiUrl ?? null,
          licenseStatus: s.licenseStatus,
          commercialAllowed: s.commercialAllowed,
          redistributionAllowed: s.redistributionAllowed,
          attributionRequired: s.attributionRequired,
          enabled: s.enabled,
          refreshIntervalMinutes: s.refreshIntervalMinutes,
          rateLimitPerMinute: s.rateLimitPerMinute ?? null,
          healthStatus: "unknown",
        },
      });
      continue;
    }
    if (forceDefaults) {
      await db.jobSource.update({
        where: { key: s.key },
        data: {
          name: s.name,
          type: s.type,
          baseUrl: s.baseUrl,
          apiUrl: s.apiUrl ?? null,
          licenseStatus: s.licenseStatus,
          commercialAllowed: s.commercialAllowed,
          redistributionAllowed: s.redistributionAllowed,
          attributionRequired: s.attributionRequired,
          enabled: s.enabled,
          refreshIntervalMinutes: s.refreshIntervalMinutes,
          rateLimitPerMinute: s.rateLimitPerMinute ?? null,
        },
      });
    }
  }
}

/**
 * Runnable sources = registry metadata ∩ DB enabled+APPROVED.
 * If DB row missing, falls back to static entry (and ensureSourcesInDb should have run).
 *
 * Adapter reference, capabilities, attribution, and HTTP config are carried
 * through so the pipeline can resolve them without a separate lookup table.
 */
export async function getRunnableSources(
  sourceKeys?: string[],
): Promise<SourceRegistryEntry[]> {
  await ensureSourcesInDb(false);

  const rows = await db.jobSource.findMany({
    where: sourceKeys?.length ? { key: { in: sourceKeys } } : undefined,
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const out: SourceRegistryEntry[] = [];
  for (const meta of SOURCE_REGISTRY) {
    if (sourceKeys?.length && !sourceKeys.includes(meta.key)) continue;
    const row = byKey.get(meta.key);
    const enabled = row ? row.enabled : meta.enabled;
    const licenseStatus = (row?.licenseStatus ??
      meta.licenseStatus) as LicenseStatus;
    const entry: SourceRegistryEntry = {
      ...meta,
      enabled,
      licenseStatus,
      rateLimitPerMinute:
        row?.rateLimitPerMinute ?? meta.rateLimitPerMinute ?? null,
      refreshIntervalMinutes:
        row?.refreshIntervalMinutes ?? meta.refreshIntervalMinutes,
      consecutiveFailures:
        typeof (row as { consecutiveFailures?: number } | undefined)
          ?.consecutiveFailures === "number"
          ? (row as { consecutiveFailures: number }).consecutiveFailures
          : 0,
      lastErrorAt:
        (row as { lastErrorAt?: Date | null } | undefined)?.lastErrorAt ?? null,
    };
    if (isProductionIngestAllowed(entry)) out.push(entry);
  }
  return out;
}
