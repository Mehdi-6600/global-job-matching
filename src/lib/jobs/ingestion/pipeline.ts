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
 *  - Source lease is fail-closed: if ownership cannot be confirmed, the
 *    worker stops instead of silently continuing without a valid lease.
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
} from "./registry";
import { arbeitnowAdapter } from "./adapters/arbeitnow";
import type { IngestJobDraft, IngestStats, JobSourceAdapter } from "./types";
import { getRunnableSources } from "./registry";
import { recordSourceRun } from "./source-run";
import { upsertSourceListing } from "./provenance";
import { applyAbsenceFreshness } from "./absence-freshness";
import { makeNamespacedExternalId } from "./identity";
import {
  loadSourceCheckpoint,
  saveSourceCheckpoint,
  clearSourceCheckpoint,
} from "./checkpoint";
import { evaluateCircuit } from "./circuit-breaker";
import { contentFingerprint } from "./content-fingerprint";
import {
  tryAcquireSourceLease,
  renewSourceLease,
  releaseSourceLease,
  type SourceLease,
} from "./source-lease";
import { tryAcquireSourceQuota } from "./rate-limit";


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
    description?: string | null;
    type?: string | null;
    remote?: boolean | null;
    salary?: string | null;
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
    description: job.description ?? null,
    type: job.type ?? null,
    remote: job.remote ?? null,
    salary: job.salary ?? null,
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
  description: true,
  type: true,
  remote: true,
  salary: true,
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
  /* Level 1a — JobSourceListing (sourceKey + sourceJobId)                  */
  /* ---------------------------------------------------------------------- */
  const listingClient = (
    db as unknown as {
      jobSourceListing?: {
        findUnique: (args: unknown) => Promise<{ jobId: string } | null>;
      };
    }
  ).jobSourceListing;

  if (listingClient && draft.sourceKey && draft.sourceJobId) {
    try {
      const listing = await listingClient.findUnique({
        where: {
          sourceKey_sourceJobId: {
            sourceKey: draft.sourceKey,
            sourceJobId: draft.sourceJobId,
          },
        },
      });
      if (listing?.jobId) {
        const byListing = await db.job.findFirst({
          where: { id: listing.jobId, postedById: null },
          select: existingJobSelect,
        });
        if (byListing) {
          return { ref: toExistingJobRef(byListing), confidence: 1.0 };
        }
      }
    } catch {
      // listing table may be missing before migrate
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Level 1b — namespaced externalId                                        */
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
): Promise<string | null> {
  /* 1. Quality gate */
  const quality = assessJobQuality(draft);
  if (!quality.ok) {
    stats.qualityRejected++;
    stats.skipped++;
    return null;
  }

  stats.validated++;

  /* Normalize source-scoped external identity (never cross-source collide). */
  const namespacedExternalId = makeNamespacedExternalId(
    draft.sourceKey,
    draft.sourceJobId || draft.externalId,
  );
  const draftForDedup: IngestJobDraft = {
    ...draft,
    externalId: namespacedExternalId,
  };

  /* 2. Strict dedup (listing L1 + URL levels) */
  const existing = await findDedupCandidate(draftForDedup);

  const { city, country } = parseLocation(draft.location);
  const location = formatLocation(city, country);
  const occupation = inferOccupation(draft.title);
  const now = new Date();
  const syncTag = `synced:${now.toISOString().slice(0, 10)}`;

  /* ---------------------------------------------------------------------- */
  /* Existing imported job                                                   */
  /* ---------------------------------------------------------------------- */
  if (existing) {
    const fp = contentFingerprint({
      title: draft.title,
      description: draft.description,
      location,
      applyUrl: draft.applyUrl,
      externalUrl: draft.externalUrl,
      employmentType: draft.employmentType,
      remote: draft.remote,
      salaryText: draft.salaryText,
      company: draft.company,
    });
    const storedDesc = existing.ref.description ?? "";
    const prevFp = contentFingerprint({
      title: existing.ref.title,
      description: storedDesc,
      location: existing.ref.location,
      applyUrl: existing.ref.applyUrl ?? null,
      externalUrl: existing.ref.externalUrl ?? null,
      employmentType: existing.ref.type ?? "",
      remote: existing.ref.remote ?? false,
      salaryText: existing.ref.salary ?? null,
      company: existing.ref.companyName ?? "",
    });

    /*
     * Defensive second-level protection:
     * the candidate was selected with postedById = null.
     *
     * The update itself also requires postedById = null so a job that
     * became employer-owned between SELECT and UPDATE is not modified.
     */
    if (fp === prevFp && storedDesc.length > 0) {
      /* Touch freshness only — no content rewrite */
      const touched = await db.job.updateMany({
        where: { id: existing.ref.id, postedById: null },
        data: {
          lastSeenAt: now,
          lastVerifiedAt: now,
          freshnessStatus: "fresh",
        },
      });
      if (touched.count === 0) {
        stats.skipped++;
        stats.duplicates++;
        return null;
      }
      stats.updated++;
      try {
        await upsertSourceListing(existing.ref.id, draftForDedup);
      } catch {
        // provenance best-effort
      }
      return namespacedExternalId;
    }

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
        externalId: namespacedExternalId,
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
      return null;
    }

    stats.updated++;
    try {
      await upsertSourceListing(existing.ref.id, draftForDedup);
    } catch {
      // provenance best-effort
    }
    return namespacedExternalId;
  }

  /* ---------------------------------------------------------------------- */
  /* New imported job                                                        */
  /* ---------------------------------------------------------------------- */
  const company = await resolveCompany(
    draft.company,
    draft.location,
  );

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
        externalId: namespacedExternalId,
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
      await upsertSourceListing(created.id, draftForDedup);
    } catch {
      // provenance best-effort
    }
    return namespacedExternalId;
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

  /*
   * Lease loss is not a hard failure of the source itself — we simply
   * stopped because another worker owns it now. The next run can safely
   * resume from the saved checkpoint.
   */
  if (stats.leaseLost) {
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
    /** When true, ignore saved cursor and start at page 1. */
    resetCheckpoint?: boolean;
  },
): Promise<IngestStats[]> {
  const started = Date.now();
  const requestedKeys = options?.sourceKeys;
  const maxPages = clampMaxPages(options?.maxPages);

  const enabled = await getRunnableSources(requestedKeys);

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
    const seenExternalIds: string[] = [];

    /* Circuit breaker — open sources skip without burning budget */
    const circuit = evaluateCircuit({
      enabled: source.enabled !== false,
      consecutiveFailures:
        typeof (source as { consecutiveFailures?: number }).consecutiveFailures ===
        "number"
          ? ((source as { consecutiveFailures?: number }).consecutiveFailures ?? 0)
          : 0,
      lastErrorAt: (source as { lastErrorAt?: Date | null }).lastErrorAt ?? null,
    });
    if (!circuit.allowRequest) {
      stats.finishedAt = new Date().toISOString();
      stats.completeness = "FAILED";
      stats.errors.push(circuit.reason);
      allStats.push(stats);
      continue;
    }

    /* Atomic lease — concurrent workers cannot both hold a live lease */
    const lease = await tryAcquireSourceLease(source.key);
    if (!lease) {
      stats.finishedAt = new Date().toISOString();
      stats.completeness = "PARTIAL";
      stats.errors.push("source_lease_held");
      allStats.push(stats);
      continue;
    }

    const rateLimit =
      (source as { rateLimitPerMinute?: number | null }).rateLimitPerMinute;
    if (!tryAcquireSourceQuota(source.key, rateLimit)) {
      stats.finishedAt = new Date().toISOString();
      stats.completeness = "PARTIAL";
      stats.errors.push("rate_limited");
      allStats.push(stats);
      /*
       * Release the lease we just acquired: the quota gate rejected this
       * run, so we must not hold a live lease for a source we never touch.
       */
      await releaseSourceLease(lease);
      continue;
    }

    let startPage = 1;
    let resumeCursor: string | null | undefined;
    if (!options?.resetCheckpoint) {
      const cp = await loadSourceCheckpoint(source.key);
      if (cp?.page != null && cp.page > 1) {
        startPage = cp.page;
      }
      if (cp?.cursor) {
        resumeCursor = cp.cursor;
      } else if (cp?.token) {
        resumeCursor = cp.token;
      }
    } else {
      await clearSourceCheckpoint(source.key);
    }

    // Pages processed this invocation (for cursor math)
    let pagesThisRun = 0;

    try {
      for (
        let page = startPage;
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
            cursor: resumeCursor,
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

        /* Advance runtime cursor for next iteration (cursor-based adapters) */
        if (result.nextCursor !== undefined) {
          resumeCursor = result.nextCursor;
        }

        /*
         * Heartbeat: renew the lease before we spend time on persistence.
         *
         * If the renewal fails, we no longer have proof that we own the
         * source. Continuing would risk racing with the new owner and
         * producing duplicate or conflicting writes. Fail-closed: stop,
         * record the loss, and preserve the checkpoint so the next valid
         * owner can resume cleanly.
         */
        const renewed = await renewSourceLease(lease);
        if (!renewed) {
          stats.leaseLost = true;
          stats.errors.push("source_lease_lost");
          /*
           * Save checkpoint for the page we just finished fetching but
           * before persisting, so the next owner starts from the right
           * place. `page` is the current fetch; we have not persisted it.
           */
          try {
            await saveSourceCheckpoint(source.key, {
              page,
              cursor: resumeCursor ?? null,
            });
          } catch {
            // best-effort: lease loss must not be masked by checkpoint errors
          }
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
            const seenId = await persistDraft(draft, stats);
            if (seenId) seenExternalIds.push(seenId);
          } catch (error) {
            stats.failed++;
            pushError(
              stats,
              error,
              "persist_error",
            );
          }
        }

        pagesThisRun += 1;

        if (stats.timedOut) {
          await saveSourceCheckpoint(source.key, {
            page,
            cursor: resumeCursor ?? null,
          });
          break;
        }

        if (!result.hasMore) {
          await clearSourceCheckpoint(source.key);
          break;
        }

        await saveSourceCheckpoint(source.key, {
          page: page + 1,
          cursor: resumeCursor ?? null,
        });
      }
    } catch (error) {
      stats.failed++;
      pushError(
        stats,
        error,
        "source_failed",
      );
    } finally {
      /*
       * Release is best-effort and ownership-scoped: if we already lost
       * the lease to another worker, `count === 0` and no one else is
       * affected. We do not act on the boolean here — the finally block
       * must never throw.
       */
      await releaseSourceLease(lease);
    }

    stats.finishedAt = new Date().toISOString();
    stats.durationMs =
      new Date(stats.finishedAt).getTime() -
      new Date(stats.startedAt).getTime();
    stats.completeness = computeCompleteness(stats);
    allStats.push(stats);

    if (stats.completeness === "FULL") {
      await clearSourceCheckpoint(source.key);
    } else if (stats.completeness === "FAILED" && pagesThisRun === 0) {
      // Hard fail before any page — do not advance cursor
    }

    try {
      await recordSourceRun(stats);
    } catch {
      // best-effort: metrics must never fail the ingestion run
    }
    if (stats.completeness === "FULL") {
      try {
        await applyAbsenceFreshness({
          sourceKey: source.key,
          completeness: stats.completeness,
          seenExternalIds,
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
