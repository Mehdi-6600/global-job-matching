/**
 * Static defaults + DB as runtime Source of Truth for enablement/license.
 * Legal gate is fail-closed: enabled + APPROVED + allowed + allowed.
 * For ATS providers, boards must additionally be APPROVED in SourceCompany.
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
import { smartrecruitersAdapter } from "./adapters/smartrecruiters";
import { workableAdapter } from "./adapters/workable";
import { recruiteeAdapter } from "./adapters/recruitee";

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
    notes: "Existing production source.",
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
    notes: "DISABLED. ToU clauses 2/30/93 prohibit automated extraction and redistribution. Do not enable without written permission.",
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
    notes: "Reviewed 2026-09-23. robots.txt Allow, Content-Signal all yes, public AI catalog.",
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
  {
    key: "remoteok",
    name: "Remote OK",
    type: "aggregator",
    baseUrl: "https://remoteok.com",
    apiUrl: "https://remoteok.com/api",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Remote OK",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 10,
    notes: "Reviewed 2026-09-24. API ToS grants permission conditioned on follow link + naming Remote OK. No logo use. UI links must not use rel=nofollow.",
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
  {
    key: "greenhouse",
    name: "Greenhouse",
    type: "ats_provider",
    baseUrl: "https://boards.greenhouse.io",
    apiUrl: "https://boards-api.greenhouse.io/v1/boards",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Greenhouse",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes: "Reviewed 2026-09-24. Official Job Board API docs explicitly authorize third-party consumption ('build careers pages'). Board-level gate enforced via SourceCompany: each board must be APPROVED before fetching.",
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
      providesSourceUpdatedAt: true,
      providesCompany: true,
      providesLocation: true,
      providesEmploymentType: false,
      providesDescription: true,
    },
  },
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
    notes: "DISABLED. Lever ToS is a commercial agreement; no explicit third-party consumption grant. Pending ToS clarification.",
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
    notes: "DISABLED. Unlisted jobs are never ingested. Board-level legal gate enforced via SourceCompany.",
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
  {
    key: "smartrecruiters",
    name: "SmartRecruiters",
    type: "ats_provider",
    baseUrl: "https://jobs.smartrecruiters.com",
    apiUrl: "https://api.smartrecruiters.com/v1/companies",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via SmartRecruiters",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "Reviewed 2026-09-24. Public company postings API (same class as Greenhouse Job Board API). Board-level gate via SourceCompany (APPROVED only). Keep apply URL + attribution. ONE board per page on Vercel Hobby.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 8_000_000,
    },
    adapter: smartrecruitersAdapter,
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
  {
    key: "workable",
    name: "Workable",
    type: "ats_provider",
    baseUrl: "https://apply.workable.com",
    apiUrl: "https://apply.workable.com/api/v1/widget/accounts",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Workable",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "Reviewed 2026-09-24. Public widget/accounts JSON used by employer careers pages. Board-level SourceCompany gate required. Attribution + apply URL required. ONE board per page on Vercel Hobby.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 8_000_000,
    },
    adapter: workableAdapter,
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
  {
    key: "recruitee",
    name: "Recruitee",
    type: "ats_provider",
    baseUrl: "https://recruitee.com",
    apiUrl: "https://{company}.recruitee.com/api/offers",
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    attribution: "Jobs via Recruitee",
    robotsStatus: "allowed",
    termsStatus: "allowed",
    enabled: true,
    refreshIntervalMinutes: 360,
    rateLimitPerMinute: 20,
    notes:
      "Reviewed 2026-09-24. Public /api/offers/ JSON on each employer careers subdomain. Board-level SourceCompany gate required. Attribution + apply URL required. ONE board per page on Vercel Hobby.",
    language: "en",
    httpConfig: {
      timeoutMs: 15_000,
      maxAttempts: 3,
      maxResponseBytes: 8_000_000,
    },
    adapter: recruiteeAdapter,
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
