/**
 * Static seed registry — DB JobSource rows should mirror these.
 * UNKNOWN / NEEDS_PERMISSION sources must never run in production ingestion.
 */
import type { LicenseStatus } from "./types";

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
  notes: string;
};

export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    key: "arbeitnow",
    name: "Arbeitnow",
    type: "job_board",
    baseUrl: "https://www.arbeitnow.com",
    apiUrl: "https://www.arbeitnow.com/api/job-board-api",
    // Operational: already used in production sync. Legal re-verification recommended.
    licenseStatus: "APPROVED",
    commercialAllowed: true,
    redistributionAllowed: true,
    attributionRequired: true,
    enabled: true,
    refreshIntervalMinutes: 360,
    notes: "Existing production source. Re-verify ToS periodically.",
  },
  {
    key: "remoteok",
    name: "RemoteOK",
    type: "job_board",
    baseUrl: "https://remoteok.com",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 360,
    notes: "Fetcher exists; production disabled until Terms confirmed.",
  },
  {
    key: "jooble",
    name: "Jooble",
    type: "aggregator",
    baseUrl: "https://jooble.org",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 720,
    notes: "Requires API agreement / key before enable.",
  },
  {
    key: "adzuna",
    name: "Adzuna",
    type: "aggregator",
    baseUrl: "https://www.adzuna.com",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 360,
    notes: "Licensed aggregator candidate — attribution + agreement required.",
  },
  {
    key: "greenhouse",
    name: "Greenhouse",
    type: "ats",
    baseUrl: "https://www.greenhouse.io",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 180,
    notes: "Public board endpoints ≠ redistribution license.",
  },
  {
    key: "lever",
    name: "Lever",
    type: "ats",
    baseUrl: "https://www.lever.co",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 180,
    notes: "Public board endpoints ≠ redistribution license.",
  },
  {
    key: "ashby",
    name: "Ashby",
    type: "ats",
    baseUrl: "https://www.ashbyhq.com",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 180,
    notes: "Adapter-ready later; disabled until permission model clear.",
  },
  {
    key: "personio",
    name: "Personio",
    type: "ats",
    baseUrl: "https://www.personio.com",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 180,
    notes: "Disabled until legal/commercial status verified.",
  },
  {
    key: "usajobs",
    name: "USAJOBS",
    type: "government",
    baseUrl: "https://www.usajobs.gov",
    licenseStatus: "NEEDS_PERMISSION",
    commercialAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    enabled: false,
    refreshIntervalMinutes: 360,
    notes: "Requires official API access approval.",
  },
];

export function isProductionIngestAllowed(entry: SourceRegistryEntry): boolean {
  return (
    entry.enabled &&
    entry.licenseStatus === "APPROVED" &&
    entry.redistributionAllowed
  );
}

export function getEnabledSources(): SourceRegistryEntry[] {
  return SOURCE_REGISTRY.filter(isProductionIngestAllowed);
}
