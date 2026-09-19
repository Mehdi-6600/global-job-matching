/**
 * Central ingestion pipeline — adapters feed drafts; this layer
 * quality-gates, dedups, and persists. Never mutates employer jobs.
 *
 * Design invariants:
 *  - Employer-owned jobs (postedById != null) are never touched.
 *  - Dedup is 3-level: externalId → externalUrl → applyUrl.
 *  - Whole run has a hard time budget (MAX_EXECUTION_MS).
 *  - License-blocked sources are reported, never ingested.
 */
import { db } from "@/lib/db";
import {
  parseLocation,
  mapJobType,
  generateSlug,
  guessCurrency,
  guessExperience,
} from "@/lib/jobs/sync-normalize";
import { assessJobQuality } from "./quality";
import { scoreDedup, type ExistingJobRef } from "./dedup";
import { inferOccupation } from "./occupation";
import {
  getEnabledSources,
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
} from "./registry";
import { arbeitnowAdapter } from "./adapters/arbeitnow";
import type { IngestJobDraft, IngestStats, JobSourceAdapter } from "./types";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const ADAPTERS: Record<string, JobSourceAdapter> = {
  arbeitnow: arbeitnowAdapter,
};

const MAX_EXECUTION_MS = 55_000;
const MAX_PAGES_PER_SOURCE = 5;
const DEDUP_CONFIDENCE_THRESHOLD = 0.9;
const PER_PAGE = 100;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isTimedOut(started: number): boolean {
  return Date.now() - started > MAX_EXECUTION_MS;
}

function safeTags(base: string[] | undefined, extras: string[]): string[] {
  return Array.from(new Set([...(base ?? []), ...extras]));
}

function formatLocation(city: string, country: string): string {
  const joined = `${city ?? ""}, ${country ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim();
  return joined || "Remote";
}

function emptyStats(sourceKey: string): IngestStats {
  return {
    sourceKey,
    startedAt: new Date().toISOString(),
    fetched: 0,
    validated: 0,
    created: 0,
    updated: 0,
    duplicates: 0,
    skipped: 0,
    qualityRejected: 0,
    failed: 0,
    timedOut: false,
    completeness: "PARTIAL",
    errors: [],
  };
}

/* -------------------------------------------------------------------------- */
/*  Company resolution                                                        */
/* -------------------------------------------------------------------------- */

async function resolveCompany(name: string, location: string) {
  const cleanName = name.trim().slice(0, 200);
  const slug = generateSlug(cleanName) || `company-${Date.now().toString(36)}`;

  // Try slug match first (cheap), then case-insensitive name match.
  const existing = await db.company.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: cleanName, mode: "insensitive" } },
      ],
    },
  });
  if (existing) return existing;

  return db.company.create({
    data: {
      name: cleanName,
      // Ensure uniqueness even under concurrency.
      slug: `${slug}-${Math.random().toString(36).slice(2, 8)}`,
      location: location.slice(0, 200) || "Remote",
      status: "verified",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Dedup                                                                     */
/* -------------------------------------------------------------------------- */

async function findDedupCandidate(
  draft: IngestJobDraft,
): Promise<{ ref: ExistingJobRef; confidence: number } | null> {
  /* Level 1 — externalId (strongest signal, employer-protected) */
  const byExt = await db.job.findFirst({
    where: { externalId: draft.externalId, postedById: null },
    select: {
      id: true,
      externalId: true,
      externalUrl: true,
      applyUrl: true,
      title: true,
      location: true,
      postedById: true,
      company: { select: { name: true } },
    },
  });

  if (byExt) {
    return {
      ref: {
        id: byExt.id,
        externalId: byExt.externalId,
        externalUrl: byExt.externalUrl,
        applyUrl: byExt.applyUrl,
        title: byExt.title,
        location: byExt.location,
        postedById: byExt.postedById,
        companyName: byExt.company?.name,
      },
      confidence: 1.0,
    };
  }

  /* Level 2/3 — URL match among imported jobs only */
  const url = draft.applyUrl ?? draft.externalUrl;
  if (!url) return null;

  const byUrl = await db.job.findFirst({
    where: {
      postedById: null,
      OR: [{ externalUrl: url }, { applyUrl: url }],
    },
    select: {
      id: true,
      externalId: true,
      externalUrl: true,
      applyUrl: true,
      title: true,
      location: true,
      postedById: true,
      company: { select: { name: true } },
    },
  });
  if (!byUrl) return null;

  const ref: ExistingJobRef = {
    id: byUrl.id,
    externalId: byUrl.externalId,
    externalUrl: byUrl.externalUrl,
    applyUrl: byUrl.applyUrl,
    title: byUrl.title,
    location: byUrl.location,
    postedById: byUrl.postedById,
    companyName: byUrl.company?.name,
  };

  const match = scoreDedup(draft, ref);
  if (!match || match.confidence < DEDUP_CONFIDENCE_THRESHOLD) return null;

  return { ref, confidence: match.confidence };
}

/* -------------------------------------------------------------------------- */
/*  Persistence                                                               */
/* -------------------------------------------------------------------------- */

async function persistDraft(
  draft: IngestJobDraft,
  stats: IngestStats,
): Promise<void> {
  /* 1. Quality gate */
  const quality = assessJobQuality(draft);
  if (!quality.ok) {
    stats.qualityRejected++;
    stats.skipped++;
    return;
  }
  stats.validated++;

  /* 2. Dedup */
  const existing = await findDedupCandidate(draft);

  const { city, country } = parseLocation(draft.location);
  const occ = inferOccupation(draft.title);
  const now = new Date();
  const syncTag = `synced:${now.toISOString().slice(0, 10)}`;

  if (existing) {
    /* 3a. Update existing imported job (never employer jobs) */
    await db.job.update({
      where: { id: existing.ref.id },
      data: {
        title: draft.title,
        description: draft.description,
        location: formatLocation(city, country),
        remote: draft.remote,
        type: mapJobType(draft.employmentType),
        externalUrl: draft.externalUrl,
        applyUrl: draft.applyUrl,
        source: draft.sourceKey,
        externalId: draft.externalId,
        lastSeenAt: now,
        lastVerifiedAt: now,
        freshnessStatus: "fresh",
        descriptionIsSnippet: draft.descriptionIsSnippet,
        qualityScore: quality.score,
        occupation: occ.occupation,
        occupationFamily: occ.occupationFamily,
        seniority: occ.seniority,
        attribution: draft.attribution,
        tags: safeTags(draft.tags, [
          `source:${draft.sourceKey}`,
          syncTag,
        ]),
      },
    });
    stats.updated++;
    return;
  }

  /* 3b. Insert new imported job */
  const company = await resolveCompany(draft.company, draft.location);

  await db.job.create({
    data: {
      title: draft.title,
      description: draft.description,
      location: formatLocation(city, country),
      remote: draft.remote,
      type: mapJobType(draft.employmentType),
      experience: guessExperience(draft.title, draft.tags, draft.description),
      currency: draft.currency || guessCurrency(draft.location, country),
      salaryMin: draft.salaryMin ?? null,
      salaryMax: draft.salaryMax ?? null,
      salary: draft.salaryText ?? null,
      requirements: [...draft.skills].slice(0, 40),
      responsibilities: [],
      benefits: [],
      tags: safeTags(draft.tags, [`source:${draft.sourceKey}`, syncTag]),
      status: "active",
      companyId: company.id,
      postedById: null, // invariant: imported jobs are never employer-owned
      externalId: draft.externalId,
      externalUrl: draft.externalUrl,
      applyUrl: draft.applyUrl,
      source: draft.sourceKey,
      publishedAt: draft.publishedAt ?? now,
      firstSeenAt: now,
      lastSeenAt: now,
      lastVerifiedAt: now,
      freshnessStatus: "fresh",
      descriptionIsSnippet: draft.descriptionIsSnippet,
      qualityScore: quality.score,
      occupation: occ.occupation,
      occupationFamily: occ.occupationFamily,
      seniority: occ.seniority,
      attribution: draft.attribution,
      expiresAt: draft.expiresAt ?? null,
    },
  });
  stats.created++;
}

/* -------------------------------------------------------------------------- */
/*  Completeness evaluation                                                   */
/* -------------------------------------------------------------------------- */

function computeCompleteness(stats: IngestStats): IngestStats["completeness"] {
  if (stats.timedOut) return "PARTIAL";
  if (stats.fetched === 0 && (stats.failed > 0 || stats.errors.length > 0)) {
    return "FAILED";
  }
  if (stats.failed === 0 && stats.errors.length === 0) return "FULL";
  return "PARTIAL";
}

/* -------------------------------------------------------------------------- */
/*  Public entrypoint                                                         */
/* -------------------------------------------------------------------------- */

export async function runIngestion(options?: {
  sourceKeys?: string[];
  maxPages?: number;
}): Promise<IngestStats[]> {
  const started = Date.now();
  const requestedKeys = options?.sourceKeys;
  const maxPages = options?.maxPages ?? MAX_PAGES_PER_SOURCE;

  const enabled = getEnabledSources().filter((s) => {
    if (requestedKeys?.length) return requestedKeys.includes(s.key);
    return true;
  });

  const allStats: IngestStats[] = [];
  const processedKeys = new Set<string>();

  for (const source of enabled) {
    processedKeys.add(source.key);

    /* License gate: report but do not ingest */
    if (!isProductionIngestAllowed(source)) {
      const blocked = emptyStats(source.key);
      blocked.finishedAt = new Date().toISOString();
      blocked.completeness = "FAILED";
      blocked.errors.push(`license_blocked:${source.licenseStatus}`);
      allStats.push(blocked);
      continue;
    }

    const adapter = ADAPTERS[source.key];
    if (!adapter) {
      const missing = emptyStats(source.key);
      missing.finishedAt = new Date().toISOString();
      missing.completeness = "FAILED";
      missing.errors.push("adapter_missing");
      allStats.push(missing);
      continue;
    }

    const stats = emptyStats(source.key);

    try {
      for (let page = 1; page <= maxPages; page++) {
        if (isTimedOut(started)) {
          stats.timedOut = true;
          break;
        }

        const result = await adapter.fetchPage({ page, perPage: PER_PAGE });
        stats.fetched += result.fetched;
        if (result.errors?.length) stats.errors.push(...result.errors);

        for (const draft of result.jobs) {
          if (isTimedOut(started)) {
            stats.timedOut = true;
            break;
          }
          try {
            await persistDraft(draft, stats);
          } catch (e) {
            stats.failed++;
            stats.errors.push(
              e instanceof Error ? e.message.slice(0, 200) : "persist_error",
            );
          }
        }

        if (stats.timedOut || !result.hasMore) break;
      }
    } catch (e) {
      stats.failed++;
      stats.errors.push(
        e instanceof Error ? e.message.slice(0, 200) : "source_failed",
      );
    }

    stats.finishedAt = new Date().toISOString();
    stats.durationMs =
      new Date(stats.finishedAt).getTime() -
      new Date(stats.startedAt).getTime();
    stats.completeness = computeCompleteness(stats);

    allStats.push(stats);
  }

  /* Report requested-but-skipped registry sources (license-blocked, not enabled, etc.) */
  if (requestedKeys?.length) {
    for (const key of requestedKeys) {
      if (processedKeys.has(key)) continue;
      const reg = SOURCE_REGISTRY.find((s) => s.key === key);
      if (!reg) continue;

      const skipped = emptyStats(key);
      skipped.finishedAt = new Date().toISOString();
      skipped.completeness = "FAILED";
      skipped.errors.push(
        isProductionIngestAllowed(reg)
          ? "source_not_enabled"
          : `license_blocked:${reg.licenseStatus}`,
      );
      allStats.push(skipped);
    }
  }

  return allStats;
}
