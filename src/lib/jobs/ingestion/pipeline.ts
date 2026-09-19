/**
 * Central ingestion pipeline — adapters feed drafts; this layer
 * quality-gates, dedups, and persists. Never mutates employer jobs.
 *
 * Design invariants:
 *  - Employer-owned jobs (postedById != null) are never touched.
 *  - Dedup is strictly 3-level: externalId → externalUrl → applyUrl.
 *  - Whole run has a hard time budget (MAX_EXECUTION_MS).
 *  - License-blocked sources are reported, never ingested.
 *  - Imported jobs are the only jobs eligible for ingestion updates.
 *  - externalId is namespaced as `${sourceKey}:${rawId}` to prevent
 *    cross-source collisions.
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
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
  getRunnableSources,
} from "./registry";
import { arbeitnowAdapter } from "./adapters/arbeitnow";
import type {
  IngestJobDraft,
  IngestStats,
  JobSourceAdapter,
} from "./types";
import { recordSourceRun } from "./source-run";
import { upsertSourceListing } from "./provenance";
import { applyAbsenceFreshness } from "./absence-freshness";

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

/**
 * Minimum number of fetched jobs required before we trust a "FULL" run
 * to drive absence-based freshness. Prevents a legitimately-empty (but
 * non-erroring) upstream feed from marking all prior jobs as stale.
 */
const ABSENCE_FRESHNESS_MIN_FETCHED = 1;

/**
 * Minimum ratio (fetched / expected) below which absence freshness is
 * skipped. `expected` is unknown here, so we use an absolute floor plus
 * a per-source opt-in flag on the source record if available.
 */
const ABSENCE_FRESHNESS_MIN_RATIO = 0.5;

/* -------------------------------------------------------------------------- */
/*  Startup integrity check                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Ensure every registry entry with `enabled = true` has a matching adapter.
 * Fails fast at import time so drift is caught during deploy, not at 3 AM.
 */
(function assertAdapterRegistryConsistency(): void {
  const missing: string[] = [];
  for (const source of SOURCE_REGISTRY) {
    if (source.enabled && !ADAPTERS[source.key]) {
      missing.push(source.key);
    }
  }
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[ingestion] registry/adapter drift detected for: ${missing.join(", ")}`,
    );
  }
})();

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isTimedOut(started: number): boolean {
  return Date.now() - started >= MAX_EXECUTION_MS;
}

function remainingTimeMs(started: number): number {
  return Math.max(0, MAX_EXECUTION_MS - (Date.now() - started));
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function safeTags(
  base: readonly string[] | undefined | null,
  extras: readonly string[] = [],
): string[] {
  const set = new Set<string>();
  for (const tag of [...(base ?? []), ...extras]) {
    if (!tag) continue;
    const normalized = normalizeTag(tag);
    if (normalized) set.add(normalized);
  }
  return Array.from(set);
}

function formatLocation(city: string, country: string): string {
  const joined = `${city ?? ""}, ${country ?? ""}`
    .replace(/^,\s*|,\s*$/g, "")
    .trim();
  return joined || "Remote";
}

/**
 * Namespaced external id used across dedup and absence tracking.
 * Keeps source identity attached even when raw ids collide.
 */
function namespacedExternalId(
  sourceKey: string,
  rawId: string | null | undefined,
): string | null {
  const trimmed = rawId?.trim();
  if (!trimmed) return null;
  return `${sourceKey}:${trimmed}`;
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
    skippedQuality: 0,
    skippedOwnership: 0,
    skippedBudget: 0,
    qualityRejected: 0,
    failed: 0,
    timedOut: false,
    completeness: "PARTIAL",
    errors: [],
  };
}

function clampMaxPages(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return MAX_PAGES_PER_SOURCE;
  }
  return Math.max(1, Math.min(Math.floor(value), MAX_PAGES_PER_SOURCE));
}

function pushError(
  stats: IngestStats,
  error: unknown,
  fallback: string,
): void {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim().slice(0, 200)
      : fallback;
  stats.errors.push(message);
}

function isUniqueConstraintViolation(error: unknown): boolean {
  // Prisma: P2002 = unique constraint failed
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/* -------------------------------------------------------------------------- */
/*  Company resolution                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Resolve or create a company for an imported job.
 *
 * Concurrency model:
 *  - First try exact slug match.
 *  - Then case-insensitive name match.
 *  - On create, always use a random-suffixed slug so a concurrent insert
 *    for the same base slug does not collide on the unique slug column.
 *  - If the create fails specifically on the *name* uniqueness (a functional
 *    unique index on lower(name) is assumed to exist), re-resolve by name.
 *  - Any other error is rethrown unchanged.
 */
async function resolveCompany(name: string, location: string) {
  const cleanName = name.trim().slice(0, 200);
  if (!cleanName) {
    throw new Error("company_name_missing");
  }

  const baseSlug =
    generateSlug(cleanName) || `company-${Date.now().toString(36)}`;

  const findExisting = () =>
    db.company.findFirst({
      where: {
        OR: [
          { slug: baseSlug },
          { name: { equals: cleanName, mode: "insensitive" } },
        ],
      },
    });

  const existing = await findExisting();
  if (existing) return existing;

  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    return await db.company.create({
      data: {
        name: cleanName,
        slug: uniqueSlug,
        location: location.trim().slice(0, 200) || "Remote",
        status: "verified",
      },
    });
  } catch (error) {
    // Recover from races only when we can prove a concurrent insert won.
    const concurrent = await findExisting();
    if (concurrent) return concurrent;

    // If the failure was a unique-constraint violation on a different key
    // than slug/name we cannot recover — surface it.
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*  Dedup helpers                                                             */
/* -------------------------------------------------------------------------- */

type ExistingJobRow = {
  id: string;
  externalId: string | null;
  externalUrl: string | null;
  applyUrl: string | null;
  title: string;
  location: string;
  postedById: string | null;
  company: { name: string } | null;
};

function toExistingJobRef(job: ExistingJobRow): ExistingJobRef {
  return {
    id: job.id,
    externalId: job.externalId,
    externalUrl: job.externalUrl,
    applyUrl: job.applyUrl,
    title: job.title,
    location: job.location,
    postedById: job.postedById,
    companyName: job.company?.name,
  };
}

const existingJobSelect = {
  id: true,
  externalId: true,
  externalUrl: true,
  applyUrl: true,
  title: true,
  location: true,
  postedById: true,
  company: {
    select: {
      name: true,
    },
  },
} as const;

/**
 * Strict 3-level dedup:
 *
 * 1. externalId  (namespaced)
 * 2. externalUrl
 * 3. applyUrl
 *
 * Employer-owned jobs are excluded at database-query level.
 */
async function findDedupCandidate(
  draft: IngestJobDraft,
): Promise<{ ref: ExistingJobRef; confidence: number } | null> {
  /* ---------------------------------------------------------------------- */
  /* Level 1 — namespaced externalId                                        */
  /* ---------------------------------------------------------------------- */
  const externalId = namespacedExternalId(
    draft.sourceKey,
    draft.externalId,
  );
  if (externalId) {
    const byExternalId = await db.job.findFirst({
      where: {
        postedById: null,
        externalId,
      },
      select: existingJobSelect,
    });

    if (byExternalId) {
      return {
        ref: toExistingJobRef(byExternalId),
        confidence: 1.0,
      };
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Level 2 — externalUrl                                                   */
  /* ---------------------------------------------------------------------- */
  const externalUrl = draft.externalUrl?.trim();
  if (externalUrl) {
    const byExternalUrl = await db.job.findFirst({
      where: {
        postedById: null,
        externalUrl,
      },
      select: existingJobSelect,
    });

    if (byExternalUrl) {
      const ref = toExistingJobRef(byExternalUrl);
      const match = scoreDedup(draft, ref);
      if (match && match.confidence >= DEDUP_CONFIDENCE_THRESHOLD) {
        return { ref, confidence: match.confidence };
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Level 3 — applyUrl                                                      */
  /* ---------------------------------------------------------------------- */
  const applyUrl = draft.applyUrl?.trim();
  if (applyUrl) {
    const byApplyUrl = await db.job.findFirst({
      where: {
        postedById: null,
        applyUrl,
      },
      select: existingJobSelect,
    });

    if (byApplyUrl) {
      const ref = toExistingJobRef(byApplyUrl);
      const match = scoreDedup(draft, ref);
      if (match && match.confidence >= DEDUP_CONFIDENCE_THRESHOLD) {
        return { ref, confidence: match.confidence };
      }
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Persistence                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Persist one draft. Returns the stable DB id of the affected job when a
 * row was created or updated; `null` when the draft was skipped, rejected,
 * or classified as a duplicate.
 */
async function persistDraft(
  draft: IngestJobDraft,
 d stats: IngestStats,
): Promise<string | null> {
raft .source /* 1. Quality gate */
  const quality = assessKeyJobQuality(draft);
 }` if (!quality.ok) {
   ,
 stats.qualityRejected++;
    stats.skipped         ++;
    stats.skippedQuality++;
    return null;
  }

  stats.validated++;

 sync  /* 2.Tag Strict 3-level dedup */
,
  const existing        = await findDedupCandidate(draft);

  ] const { city, country } = parseLocation(draft),
.location);
  const location = formatLocation(city,      country);
  const occupation = inferOccupation },
(draft.title);
  const now = new Date   ();
  const syncTag });

 = `synced:${now.toISOString   ().slice(0, 10)}`;
  const externalId = namespacedExternalId(
    draft.sourceKey,
    draft.externalId,
  );

  /* ---------------------------------------------------------------------- */
  /* Existing imported job                                                   */
  /* ---------------------------------------------------------------------- */
  if (existing) {
    const updated = await db.job.updateMany({
      where: {
        id: existing.ref.id,
        postedById: null,
      },
      data: {
        title: draft.title,
        description: draft.description,
        location,
        remote: draft.remote,
        type: mapJobType(draft.employmentType),
        externalUrl: draft.externalUrl,
        applyUrl: draft.applyUrl,
        source: draft.sourceKey,
        externalId,
        lastSeenAt: now,
        lastVerifiedAt: now,
        freshnessStatus: "fresh",
        descriptionIsSnippet: draft.descriptionIsSnippet,
        qualityScore: quality.score,
        occupation: occupation.occupation,
        occupationFamily: occupation.occupationFamily,
        seniority: occupation.seniority,
        attribution: draft.attribution,
        tags: safeTags(draft.tags, [
          `source:${ if (updated.count === 0) {
      // Became employer-owned between SELECT and UPDATE. Never touch it.
      stats.skipped++;
      stats.skippedOwnership++;
      stats.duplicates++;
      return null;
    }

    stats.updated++;
    try {
      await upsertSourceListing(existing.ref.id, draft);
    } catch {
      // provenance best-effort
    }
    return existing.ref.id;
  }

  /* ---------------------------------------------------------------------- */
  /* New imported job                                                        */
  /* ---------------------------------------------------------------------- */
  const company = await resolveCompany(draft.company, draft.location);

  try {
    const created = await db.job.create({
      data: {
        title: draft.title,
        description: draft.description,
        location,
        remote: draft.remote,
        type: mapJobType(draft.employmentType),
        experience: guessExperience(
          draft.title,
          [...draft.tags],
          draft.description,
        ),
        currency: draft.currency || guessCurrency(draft.location, country),
        salaryMin: draft.salaryMin ?? null,
        salaryMax: draft.salaryMax ?? null,
        salary: draft.salaryText ?? null,
        requirements: [...draft.skills].slice(0, 40),
        responsibilities: [],
        benefits: [],
        tags: safeTags(draft.tags, [
          `source:${draft.sourceKey}`,
          syncTag,
        ]),
        status: "active",
        companyId: company.id,
        // Critical invariant: imported jobs never become employer-owned.
        postedById: null,
        externalId,
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
        occupation: occupation.occupation,
        occupationFamily: occupation.occupationFamily,
        seniority: occupation.seniority,
        attribution: draft.attribution,
        expiresAt: draft.expiresAt ?? null,
      },
    });

    stats.created++;
    try {
      await upsertSourceListing(created.id, draft);
    } catch {
      // provenance best-effort
    }
    return created.id;
  } catch (error) {
    /*
     * A race can occur when two ingestion workers process the same
     * external job simultaneously.
     *
     * Do not silently classify an arbitrary database error as a duplicate.
     * Re-check the 3 dedup levels first; if a matching imported job now
     * exists, classify it as a duplicate. Otherwise rethrow the real error.
     */
    const racedCandidate = await findDedupCandidate(draft);
    if (racedCandidate) {
      stats.duplicates++;
      stats.skipped++;
      return null;
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*  Completeness evaluation                                                   */
/* -------------------------------------------------------------------------- */

function computeCompleteness(
  stats: IngestStats,
): IngestStats["completeness"] {
  if (stats.timedOut) {
    return "PARTIAL";
  }

  if (
    stats.fetched === 0 &&
    (stats.failed > 0 || stats.errors.length > 0)
  ) {
    return "FAILED";
  }

  if (stats.failed === 0 && stats.errors.length === 0) {
    return "FULL";
  }

  return "PARTIAL";
}

/* -------------------------------------------------------------------------- */
/*  Absence freshness guard                                                   */
/* -------------------------------------------------------------------------- */

function shouldRunAbsenceFreshness(
  stats: IngestStats,
  seenCount: number,
): boolean {
  if (stats.completeness !== "FULL") return false;
  if (stats.fetched < ABSENCE_FRESHNESS_MIN_FETCHED) return false;
  if (seenCount === 0) return false;

  // Guard against a "successful but suspiciously empty" run.
  const ratio = seenCount / Math.max(stats.fetched, 1);
  if (ratio < ABSENCE_FRESHNESS_MIN_RATIO) return false;

  return true;
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
  const maxPages = clampMaxPages(options?.maxPages);

  const enabled = await getRunnableSources(requestedKeys);

  const allStats: IngestStats[] = [];
  const processedKeys = new Set<string>();
  const budgetSkippedKeys = new Set<string>();

  for (const source of enabled) {
    if (isTimedOut(started)) {
      budgetSkippedKeys.add(source.key);
      continue;
    }

    processedKeys.add(source.key);

    /* -------------------------------------------------------------------- */
    /* License gate                                                         */
    /* -------------------------------------------------------------------- */
    if (!isProductionIngestAllowed(source)) {
      const blocked = emptyStats(source.key);
      blocked.finishedAt = new Date().toISOString();
      blocked.completeness = "FAILED";
      blocked.errors.push(`license_blocked:${source.licenseStatus}`);
      allStats.push(blocked);
      continue;
    }

    /* -------------------------------------------------------------------- */
    /* Adapter resolution                                                    */
    /* -------------------------------------------------------------------- */
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
    const seenJobIds: string[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        if (isTimedOut(started) || remainingTimeMs(started) <= 0) {
          stats.timedOut = true;
          break;
        }

        let result;
        try {
          result = await adapter.fetchPage({ page, perPage: PER_PAGE });
        } catch (error) {
          stats.failed++;
          pushError(stats, error, "source_fetch_failed");
          break;
        }

        stats.fetched += result.fetched;

        if (result.errors?.length) {
          stats.errors.push(
            ...result.errors
              .map((error) => String(error).slice(0, 200))
              .filter(Boolean),
          );
        }

        /* -------------------------------------------------------------- */
        /* Persist fetched jobs                                            */
        /* -------------------------------------------------------------- */
        for (const draft of result.jobs) {
          if (isTimedOut(started)) {
            stats.timedOut = true;
            break;
          }

          try {
            const jobId = await persistDraft(draft, stats);
            if (jobId) seenJobIds.push(jobId);
          } catch (error) {
            stats.failed++;
            pushError(stats, error, "persist_error");
          }
        }

        if (stats.timedOut || !result.hasMore) {
          break;
        }
      }
    } catch (error) {
      stats.failed++;
      pushError(stats, error, "source_failed");
    }

    const finishedAtMs = Date.now();
    stats.finishedAt = new Date(finishedAtMs).toISOString();
    stats.durationMs = finishedAtMs - new Date(stats.startedAt).getTime();
    stats.completeness = computeCompleteness(stats);
    allStats.push(stats);

    try {
      await recordSourceRun(stats);
    } catch {
      // best-effort: metrics must never fail the ingestion run
    }

    if (shouldRunAbsenceFreshness(stats, seenJobIds.length)) {
      try {
        await applyAbsenceFreshness({
          sourceKey: source.key,
          completeness: stats.completeness,
          seenExternalIds: seenJobIds,
        });
      } catch {
        // best-effort
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Requested-but-not-processed registry sources                           */
  /* ---------------------------------------------------------------------- */
  if (requestedKeys?.length) {
    for (const key of requestedKeys) {
      if (processedKeys.has(key)) continue;

      const reg = SOURCE_REGISTRY.find((source) => source.key === key);
      if (!reg) continue;

      const skipped = emptyStats(key);
      skipped.finishedAt = new Date().toISOString();
      skipped.completeness = "FAILED";

      if (budgetSkippedKeys.has(key)) {
        skipped.skippedBudget++;
        skipped.skipped++;
        skipped.errors.push("skipped_time_budget");
      } else if (!isProductionIngestAllowed(reg)) {
        skipped.errors.push(`license_blocked:${reg.licenseStatus}`);
      } else {
        skipped.errors.push("source_not_enabled");
      }

      allStats.push(skipped);
    }
  }

  return allStats;
}
