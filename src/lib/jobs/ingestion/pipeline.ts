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
  return Date.now() - started >= MAX_EXECUTION_MS;
}

function remainingTimeMs(started: number): number {
  return Math.max(0, MAX_EXECUTION_MS - (Date.now() - started));
}

function safeTags(
  base: readonly string[] | undefined | null,
  extras: readonly string[] = [],
): string[] {
  return Array.from(
    new Set([...(base ?? []), ...extras].filter((t): t is string => Boolean(t))),
  );
}

function formatLocation(city: string, country: string): string {
  const joined = `${city ?? ""}, ${country ?? ""}`
    .replace(/^,\s*|,\s*$/g, "")
    .trim();
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

/* -------------------------------------------------------------------------- */
/*  Company resolution                                                        */
/* -------------------------------------------------------------------------- */

async function resolveCompany(
  name: string,
  location: string,
) {
  const cleanName = name.trim().slice(0, 200);
  if (!cleanName) {
    throw new Error("company_name_missing");
  }

  const baseSlug =
    generateSlug(cleanName) ||
    `company-${Date.now().toString(36)}`;

  /*
   * Prefer an existing company by slug, then by case-insensitive name.
   * Never create a company with an empty name.
   */
  const existing = await db.company.findFirst({
    where: {
      OR: [
        { slug: baseSlug },
        {
          name: {
            equals: cleanName,
            mode: "insensitive",
          },
        },
      ],
    },
  });

  if (existing) return existing;

  /*
   * The random suffix prevents most concurrent slug collisions.
   * If the database schema enforces slug uniqueness and a concurrent
   * insert still wins the race, retry by resolving the company again.
   */
  const uniqueSlug =
    `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

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
    const concurrent = await db.company.findFirst({
      where: {
        OR: [
          { slug: baseSlug },
          {
            name: {
              equals: cleanName,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (concurrent) return concurrent;
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*  Dedup helpers                                                             */
/* -------------------------------------------------------------------------- */

function toExistingJobRef(
  job: {
    id: string;
    externalId: string | null;
    externalUrl: string | null;
    applyUrl: string | null;
    title: string;
    location: string;
    postedById: string | null;
    company: { name: string } | null;
  },
): ExistingJobRef {
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
 * 1. externalId
 * 2. externalUrl
 * 3. applyUrl
 *
 * Employer-owned jobs are excluded at database-query level.
 */
async function findDedupCandidate(
  draft: IngestJobDraft,
): Promise<{ ref: ExistingJobRef; confidence: number } | null> {
  /* ---------------------------------------------------------------------- */
  /* Level 1 — externalId                                                   */
  /* ---------------------------------------------------------------------- */
  const externalId = draft.externalId?.trim();
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
      if (
        match &&
        match.confidence >= DEDUP_CONFIDENCE_THRESHOLD
      ) {
        return {
          ref,
          confidence: match.confidence,
        };
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
      if (
        match &&
        match.confidence >= DEDUP_CONFIDENCE_THRESHOLD
      ) {
        return {
          ref,
          confidence: match.confidence,
        };
      }
    }
  }

  return null;
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

  /* 2. Strict 3-level dedup */
  const existing = await findDedupCandidate(draft);

  const { city, country } = parseLocation(draft.location);
  const location = formatLocation(city, country);
  const occupation = inferOccupation(draft.title);
  const now = new Date();
  const syncTag = `synced:${now.toISOString().slice(0, 10)}`;

  /* ---------------------------------------------------------------------- */
  /* Existing imported job                                                   */
  /* ---------------------------------------------------------------------- */
  if (existing) {
    /*
     * Defensive second-level protection:
     * the candidate was selected with postedById = null.
     *
     * The update itself also requires postedById = null so a job that
     * became employer-owned between SELECT and UPDATE is not modified.
     */
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
        externalId: draft.externalId,
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
          `source:${draft.sourceKey}`,
          syncTag,
        ]),
      },
    });

    if (updated.count === 0) {
      /*
       * The job may have been converted to an employer-owned job
       * between candidate lookup and update.
       *
       * Never fall back to updating it.
       */
      stats.skipped++;
      stats.duplicates++;
      return;
    }

    stats.updated++;
    return;
  }

  /* ---------------------------------------------------------------------- */
  /* New imported job                                                        */
  /* ---------------------------------------------------------------------- */
  const company = await resolveCompany(
    draft.company,
    draft.location,
  );

  try {
    await db.job.create({
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
        currency:
          draft.currency ||
          guessCurrency(draft.location, country),
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
        /*
         * Critical invariant:
         * imported jobs must never become employer-owned.
         */
        postedById: null,
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
        occupation: occupation.occupation,
        occupationFamily: occupation.occupationFamily,
        seniority: occupation.seniority,
        attribution: draft.attribution,
        expiresAt: draft.expiresAt ?? null,
      },
    });

    stats.created++;
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
      return;
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

  if (
    stats.failed === 0 &&
    stats.errors.length === 0
  ) {
    return "FULL";
  }

  return "PARTIAL";
}

/* -------------------------------------------------------------------------- */
/*  Public entrypoint                                                         */
/* -------------------------------------------------------------------------- */

export async function runIngestion(
  options?: {
    sourceKeys?: string[];
    maxPages?: number;
  },
): Promise<IngestStats[]> {
  const started = Date.now();
  const requestedKeys = options?.sourceKeys;
  const maxPages = clampMaxPages(options?.maxPages);

  const enabled = getEnabledSources().filter((source) => {
    if (requestedKeys?.length) {
      return requestedKeys.includes(source.key);
    }
    return true;
  });

  const allStats: IngestStats[] = [];
  const processedKeys = new Set<string>();

  for (const source of enabled) {
    /*
     * Once the global hard budget is exhausted, stop starting new sources.
     */
    if (isTimedOut(started)) {
      break;
    }

    processedKeys.add(source.key);

    /* -------------------------------------------------------------------- */
    /* License gate                                                         */
    /* -------------------------------------------------------------------- */
    if (!isProductionIngestAllowed(source)) {
      const blocked = emptyStats(source.key);
      blocked.finishedAt = new Date().toISOString();
      blocked.completeness = "FAILED";
      blocked.errors.push(
        `license_blocked:${source.licenseStatus}`,
      );
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

    try {
      for (
        let page = 1;
        page <= maxPages;
        page++
      ) {
        if (isTimedOut(started)) {
          stats.timedOut = true;
          break;
        }

        /*
         * No adapter fetch is allowed to start if there is effectively
         * no execution budget left.
         */
        if (remainingTimeMs(started) <= 0) {
          stats.timedOut = true;
          break;
        }

        let result;
        try {
          result = await adapter.fetchPage({
            page,
            perPage: PER_PAGE,
          });
        } catch (error) {
          stats.failed++;
          pushError(
            stats,
            error,
            "source_fetch_failed",
          );
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
            await persistDraft(draft, stats);
          } catch (error) {
            stats.failed++;
            pushError(
              stats,
              error,
              "persist_error",
            );
          }
        }

        if (stats.timedOut || !result.hasMore) {
          break;
        }
      }
    } catch (error) {
      stats.failed++;
      pushError(
        stats,
        error,
        "source_failed",
      );
    }

    stats.finishedAt = new Date().toISOString();
    stats.durationMs =
      new Date(stats.finishedAt).getTime() -
      new Date(stats.startedAt).getTime();
    stats.completeness = computeCompleteness(stats);
    allStats.push(stats);
  }

  /* ---------------------------------------------------------------------- */
  /* Requested-but-not-processed registry sources                           */
  /* ---------------------------------------------------------------------- */
  if (requestedKeys?.length) {
    for (const key of requestedKeys) {
      if (processedKeys.has(key)) {
        continue;
      }

      const reg = SOURCE_REGISTRY.find(
        (source) => source.key === key,
      );

      if (!reg) {
        continue;
      }

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
