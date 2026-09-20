/**
 * Static defaults + DB as runtime Source of Truth for enablement/license.
 * UNKNOWN license never runs in production ingestion.
 *
 * The registry is the single source of truth for which adapters exist.
 * A new source = one adapter file + one registry entry. The pipeline
 * resolves adapters through this registry (no separate ADAPTERS map).
 */
import { db } from "@/lib/db";
import type {
  JobSourceAdapter,
  LicenseStatus,
  SourceCapabilities,
  SourceHttpConfig,
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
   * Optional capability declaration. The pipeline never assumes a
   * capability; this is used for diagnostics and future optimizations.
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

export function isProductionIngestAllowed(
  entry: Pick<SourceRegistryEntry, "enabled" | "licenseStatus">,
): boolean {
  if (!entry.enabled) return false;
  if (entry.licenseStatus === "UNKNOWN") return false;
  if (entry.licenseStatus === "NEEDS_PERMISSION") return false;
  if (entry.licenseStatus === "RESTRICTED") return false;
  if (entry.licenseStatus === "DISABLED") return false;
  return entry.licenseStatus === "APPROVED";
}

/** Static-only enabled list (no DB). Prefer getRunnableSources() at runtime. */
export function getEnabledSources(): SourceRegistryEntry[] {
  return SOURCE_REGISTRY.filter(isProductionIngestAllowed);
}

/**
 * Upsert static registry into JobSource table (idempotent).
 * Does not override DB licenseStatus/enabled once row exists — only fills missing.
 * To hard-sync defaults, pass forceDefaults=true (admin use).
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
 * Adapter reference, capabilities, and HTTP config are carried through so
 * the pipeline can resolve them without a separate lookup table.
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
