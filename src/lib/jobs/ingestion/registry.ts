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
 *
 * ── Adding a new source checklist ──────────────────────────────────
 *   1. Create adapter at ./adapters/<key>.ts implementing JobSourceAdapter.
 *   2. Review terms + robots for the source. If either is unclear, DO
 *      NOT flip the entry to enabled/APPROVED. Shipping disabled is
 *      the correct default.
 *   3. Add an entry below. Keep licenseStatus="UNKNOWN",
 *      robotsStatus="unknown", termsStatus="unknown", enabled=false
 *      until review is complete.
 *   4. Add adapter contract tests (see ./adapters/<key>.test.ts).
 *   5. For ATS providers (greenhouse / lever / ashby), boards must
 *      additionally be approved in the SourceCompany table — the
 *      registry entry alone is not sufficient to fetch their data.
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
import { himalayasAdapter } from "./adapters/himalayas";
import { jobicyAdapter } from "./adapters/jobicy";
import { remoteokAdapter } from "./adapters/remoteok";
import { greenhouseAdapter } from "./adapters/greenhouse";
import { leverAdapter } from "./adapters/lever";
import { ashbyAdapter } from "./adapters/ashby";

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
  attribution?: string;
  robotsStatus?: RobotsStatus;
  termsStatus?: TermsStatus;
  enabled: boolean;
  refreshIntervalMinutes: number;
  rateLimitPerMinute?: number | null;
  notes: string;
  language?: string;
  httpConfig?: SourceHttpConfig;
  adapter?: JobSourceAdapter;
  capabilities?: SourceCapabilities;
  consecutiveFailures?: number;
  lastErrorAt?: Date | null;
};

export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  /* ---------------------------------------------------------------- */
  /* arbeitnow — existing production source                           */
  /* ---------------------------------------------------------------- */
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

  /* ---------------------------------------------------------------- */
  /* himalayas — DISABLED after legal review                          */
  /*                                                                  */
  /* Reviewed 2026-09-23. Himalayas Terms of Use (clauses 2, 30,    */
  /* 93) explicitly prohibit automated data gathering, crawling, and */
  /* redistribution of job content without prior written approval.   */
  /* The public API existing does NOT override the Terms. Entry      */
  /* remains DISABLED; do not flip without written permission from   */
  /* hi@himalayas.app.                                               */
  /* ---------------------------------------------------------------- */
  {
    key: "himalayas",
    name: "Himalayas",
    type: "aggregator",
    baseUrl: "https://himalayas.app",
    apiUrl: "https://himalayas.app/jobs/api",
    licenseStatus: "RESTRICTED",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attribution: "Jobs via Himalayas",
    robotsStatus: "allowed",
    termsStatus: "restricted",
    enabled: false,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "DISABLED — Terms of Use clauses 2, 30, 93 prohibit automated " +
      "extraction and redistribution without prior written approval. " +
      "Do not enable without written permission from hi@himalayas.app.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: himalayasAdapter,
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

  /* ---------------------------------------------------------------- */
  /* jobicy — ENABLED after legal review                              */
  /*                                                                  */
  /* Reviewed 2026-09-23. Public signals all permissive:             */
  /*   - robots.txt: User-agent: * / Allow: /                        */
  /*   - Content-Signal: ai-train=yes, search=yes, ai-input=yes      */
  /*   - /.well-known/ai-catalog.json publishes a "Public Jobicy     */
  /*     MCP server for discovering and retrieving current remote    */
  /*     job listings and supported job taxonomies" — an explicit    */
  /*     invitation to third-party consumption.                      */
  /* ----------------------------------------------------------------- */
  {
    key: "jobicy",
    name: "Jobicy",
    type: "aggregator",
    baseUrl: "https://jobicy.com",
    apiUrl: "https://jobicy.com/api/v2/remote-jobs",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Jobicy",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "Global remote-only feed. Single-shot response (no pagination). " +
      "Public AI catalog + Content-Signal invite third-party consumption.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: jobicyAdapter,
    capabilities: {
      pagination: "single",
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

  /* ---------------------------------------------------------------- */
  /* remoteok — DISABLED, pending Terms review                        */
  /*                                                                  */
  /* robots.txt is permissive for /api but the site has no AI        */
  /* catalog and its Terms have not been reviewed. Stays disabled    */
  /* until Terms are explicitly reviewed and confirmed permissive.   */
  /* ---------------------------------------------------------------- */
  {
    key: "remoteok",
    name: "Remote OK",
    type: "aggregator",
    baseUrl: "https://remoteok.com",
    apiUrl: "https://remoteok.com/api",
    licenseStatus: "UNKNOWN",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attribution: "Jobs via RemoteOK",
    robotsStatus: "allowed",
    termsStatus: "unknown",
    enabled: false,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 10,
    notes:
      "robots.txt permissive but no public AI catalog. Terms not yet " +
      "reviewed — stays disabled. Do NOT enable without Terms review.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: remoteokAdapter,
    capabilities: {
      pagination: "single",
      providesExternalId: true,
      providesExternalUrl: true,
      providesApplyUrl: true,
      providesSalary: true,
      providesRemote: true,
      providesPublishedAt: true,
      providesSourceUpdatedAt: false,
      providesCompany: true,
      providesLocation: true,
      providesEmploymentType: false,
      providesDescription: true,
    },
  },

  /* ---------------------------------------------------------------- */
  /* greenhouse — ATS provider (disabled until boards approved)       */
  /* ---------------------------------------------------------------- */
  {
    key: "greenhouse",
    name: "Greenhouse",
    type: "ats_provider",
    baseUrl: "https://boards.greenhouse.io",
    apiUrl: "https://boards-api.greenhouse.io/v1/boards",
    licenseStatus: "UNKNOWN",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attribution: "Jobs via Greenhouse",
    robotsStatus: "unknown",
    termsStatus: "unknown",
    enabled: false,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "ATS provider. Board-level legal gate enforced via SourceCompany. " +
      "Provider ships disabled — enable only after Terms review.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: greenhouseAdapter,
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
      providesEmploymentType: false,
      providesDescription: true,
    },
  },

  /* ---------------------------------------------------------------- */
  /* lever — ATS provider (disabled until boards approved)            */
  /* ---------------------------------------------------------------- */
  {
    key: "lever",
    name: "Lever",
    type: "ats_provider",
    baseUrl: "https://jobs.lever.co",
    apiUrl: "https://api.lever.co/v0/postings",
    licenseStatus: "UNKNOWN",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attribution: "Jobs via Lever",
    robotsStatus: "unknown",
    termsStatus: "unknown",
    enabled: false,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "ATS provider. Board-level legal gate enforced via SourceCompany. " +
      "Provider ships disabled — enable only after Terms review.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: leverAdapter,
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

  /* ---------------------------------------------------------------- */
  /* ashby — ATS provider (disabled until boards approved)            */
  /* ---------------------------------------------------------------- */
  {
    key: "ashby",
    name: "Ashby",
    type: "ats_provider",
    baseUrl: "https://jobs.ashbyhq.com",
    apiUrl: "https://api.ashbyhq.com/posting-api/job-board",
    licenseStatus: "UNKNOWN",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attribution: "Jobs via Ashby",
    robotsStatus: "unknown",
    termsStatus: "unknown",
    enabled: false,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "ATS provider. Unlisted jobs are never ingested. Board-level " +
      "legal gate enforced via SourceCompany. Ships disabled.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 15_000_000,
    },
    adapter: ashbyAdapter,
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

export function getEnabledSources(): SourceRegistryEntry[] {
  return SOURCE_REGISTRY.filter(isProductionIngestAllowed);
}

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
