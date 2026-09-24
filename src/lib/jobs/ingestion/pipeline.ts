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
 *  - Adapter resolution goes through the registry (single source of truth).
 *  - Cursor-based pagination is loop-protected.
 *  - Attribution fallback: registry attribution is used when the adapter
 *    does not set draft.attribution.
 *  - Every source run carries a `runId` for structured logging.
 *  - Declared capabilities influence pipeline behavior:
 *      * pagination "single"  → one page only, no loop
 *      * pagination "cursor" | "token" → cursor-based loop (loop-protected)
 *      * pagination "page" or undeclared → page-based loop (default)
 */
import { randomBytes } from "crypto";
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
  ingestBlockReason,
  isProductionIngestAllowed,
  SOURCE_REGISTRY,
} from "./registry";
import type {
  IngestJobDraft,
  IngestStats,
  SourceCapabilities,
} from "./types";
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
} from "./source-lease";
import { tryAcquireSourceQuota } from "./rate-limit";
import { logIngestionEvent } from "./log";


/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Hard time budget for a single ingestion run.
 *
 * Vercel Hobby serverless functions cap at 60s. We stop at 58s to leave
 * a 2s safety margin for final bookkeeping (checkpoint save, lease
 * release, source-run metrics). Anything beyond 60s risks a hard kill
 * which would lose the checkpoint and stall the source.
 */
const MAX_EXECUTION_MS = 58_000;
const MAX_PAGES_PER_SOURCE = 5;
const DEDUP_CONFIDENCE_THRESHOLD = 0.9;
const PER_PAGE = 100;

/* -------------------------------------------------------------------------- */
/*  Capability helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Whether the pipeline should stop after the first successful page.
 * True when the source declares `pagination: "single"`.
 */
function shouldStopAfterFirstPage(
  capabilities: SourceCapabilities | undefined,
): boolean {
  return capabilities?.pagination === "single";
}

/**
 * Whether the source uses a cursor/token-based loop.
 * Both map to the same runtime behavior (resumeCursor + nextCursor).
 */
function isCursorBasedPagination(
  capabilities: SourceCapabilities | undefined,
): boolean {
  return (
    capabilities?.pagination === "cursor" ||
    capabilities?.pagination === "token"
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function generateRunId(): string {
  return randomBytes(8).toString("hex");
}

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
    runId: generateRunId(),
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

async function findDedupCandidate(
  draft: IngestJobDraft,
): Promise<{ ref: ExistingJobRef; confidence: number } | null> {
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
  sourceAttribution: string | null,
): Promise<string | null> {
  const quality = assessJobQuality(draft);
  if (!quality.ok) {
    stats.qualityRejected++;
    stats.skipped++;
    return null;
  }

  stats.validated++;

  const namespacedExternalId = makeNamespacedExternalId(
    draft.sourceKey,
    draft.sourceJobId || draft.externalId,
  );
  const draftForDedup: IngestJobDraft = {
    ...draft,
    externalId: namespacedExternalId,
  };

  const existing = await findDedupCandidate(draftForDedup);

  const { city, country } = parseLocation(draft.location);
  const location = formatLocation(city, country);
  const occupation = inferOccupation(draft.title);
  const now = new Date();
  const syncTag = `synced:${now.toISOString().slice(0, 10)}`;

  const effectiveAttribution = draft.attribution ?? sourceAttribution;

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

    if (fp === prevFp && storedDesc.length > 0) {
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
        attribution: effectiveAttribution,
        tags: safeTags(draft.tags, [
          `source:${draft.sourceKey}`,
          syncTag,
        ]),
      },
    });

    if (updated.count === 0) {
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
        attribution: effectiveAttribution,
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
    if (isTimedOut(started)) {
      break;
    }

    processedKeys.add(source.key);

    if (!isProductionIngestAllowed(source)) {
      const blocked = emptyStats(source.key);
      blocked.finishedAt = new Date().toISOString();
      blocked.completeness = "FAILED";
      const reason = ingestBlockReason(source) ?? "source_blocked";
      blocked.errors.push(reason);
      allStats.push(blocked);
      logIngestionEvent("warn", "source_blocked", {
        sourceKey: source.key,
        runId: blocked.runId,
        reason,
      });
      continue;
    }

    const adapter = source.adapter;
    if (!adapter) {
      const missing = emptyStats(source.key);
      missing.finishedAt = new Date().toISOString();
      missing.completeness = "FAILED";
      missing.errors.push("adapter_missing");
      allStats.push(missing);
      logIngestionEvent("error", "adapter_missing", {
        sourceKey: source.key,
        runId: missing.runId,
      });
      continue;
    }

    const stats = emptyStats(source.key);
    const seenExternalIds: string[] = [];
    const sourceAttribution = source.attribution ?? null;

    const capabilities = source.capabilities;
    const singlePage = shouldStopAfterFirstPage(capabilities);
    const cursorBased = isCursorBasedPagination(capabilities);

    logIngestionEvent("info", "source_run_start", {
      sourceKey: source.key,
      runId: stats.runId,
    });

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
      logIngestionEvent("warn", "source_circuit_open", {
        sourceKey: source.key,
        runId: stats.runId,
        reason: circuit.reason,
      });
      continue;
    }

    const lease = await tryAcquireSourceLease(source.key);
    if (!lease) {
      stats.finishedAt = new Date().toISOString();
      stats.completeness = "PARTIAL";
      stats.errors.push("source_lease_held");
      allStats.push(stats);
      logIngestionEvent("info", "source_lease_held", {
        sourceKey: source.key,
        runId: stats.runId,
      });
      continue;
    }

    const rateLimit =
      (source as { rateLimitPerMinute?: number | null }).rateLimitPerMinute;
    if (!tryAcquireSourceQuota(source.key, rateLimit)) {
      stats.finishedAt = new Date().toISOString();
      stats.completeness = "PARTIAL";
      stats.errors.push("rate_limited");
      allStats.push(stats);
      await releaseSourceLease(lease);
      logIngestionEvent("warn", "source_rate_limited", {
        sourceKey: source.key,
        runId: stats.runId,
      });
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

    const seenCursors = new Set<string>();

    if (typeof resumeCursor === "string" && resumeCursor.length > 0) {
      seenCursors.add(resumeCursor);
    }

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
            sourceConfig: {
              key: source.key,
              name: source.name,
              language: source.language,
              rateLimitPerMinute: source.rateLimitPerMinute,
              httpConfig: source.httpConfig,
              attribution: source.attribution ?? null,
            },
          });
        } catch (error) {
          stats.failed++;
          pushError(
            stats,
            error,
            "source_fetch_failed",
          );
          logIngestionEvent("error", "source_fetch_failed", {
            sourceKey: source.key,
            runId: stats.runId,
            page,
            error: error instanceof Error ? error.message : String(error),
          });
          break;
        }

        if (cursorBased) {
          if (
            result.nextCursor !== undefined &&
            result.nextCursor !== null &&
            result.nextCursor !== ""
          ) {
            if (seenCursors.has(result.nextCursor)) {
              stats.errors.push("pagination_loop_detected");
              logIngestionEvent("warn", "pagination_loop_detected", {
                sourceKey: source.key,
                runId: stats.runId,
                page,
              });
              try {
                await saveSourceCheckpoint(source.key, {
                  page,
                  cursor: result.nextCursor,
                });
              } catch {
                // best-effort
              }
              break;
            }
            seenCursors.add(result.nextCursor);
            resumeCursor = result.nextCursor;
          } else if (result.nextCursor === undefined) {
            // no cursor concept returned by adapter
          } else {
            resumeCursor = result.nextCursor ?? null;
          }
        }

        const renewed = await renewSourceLease(lease);
        if (!renewed) {
          stats.leaseLost = true;
          stats.errors.push("source_lease_lost");
          logIngestionEvent("warn", "source_lease_lost", {
            sourceKey: source.key,
            runId: stats.runId,
            page,
          });
          try {
            // Same stuck-page issue as timedOut: advance when more pages exist.
            const nextPage = result.hasMore ? page + 1 : page;
            await saveSourceCheckpoint(source.key, {
              page: nextPage,
              cursor: resumeCursor ?? null,
            });
          } catch {
            // best-effort
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

        for (const draft of result.jobs) {
          if (isTimedOut(started)) {
            stats.timedOut = true;
            break;
          }

          try {
            const seenId = await persistDraft(
              draft,
              stats,
              sourceAttribution,
            );
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
          // Advance page on timeout when more pages remain. Re-saving the
          // same page (e.g. large Greenhouse board "stripe") caused an
          // infinite restart on Vercel Hobby (~58s): only stripe listings
          // ever landed in JobSourceListing. Remaining jobs on this board
          // are refreshed on a later full cycle after checkpoint clears.
          const nextPage = result.hasMore ? page + 1 : page;
          await saveSourceCheckpoint(source.key, {
            page: nextPage,
            cursor: resumeCursor ?? null,
          });
          break;
        }

        if (singlePage) {
          await clearSourceCheckpoint(source.key);
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
      logIngestionEvent("error", "source_failed", {
        sourceKey: source.key,
        runId: stats.runId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await releaseSourceLease(lease);
    }

    stats.finishedAt = new Date().toISOString();
    stats.durationMs =
      new Date(stats.finishedAt).getTime() -
      new Date(stats.startedAt).getTime();
    stats.completeness = computeCompleteness(stats);
    allStats.push(stats);

    logIngestionEvent(
      stats.completeness === "FAILED" ? "error" : "info",
      "source_run_end",
      {
        sourceKey: source.key,
        runId: stats.runId,
        status: stats.completeness,
        durationMs: stats.durationMs,
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        duplicates: stats.duplicates,
        skipped: stats.skipped,
        qualityRejected: stats.qualityRejected,
        failed: stats.failed,
        pages: pagesThisRun,
      },
    );

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
          sourceKeys: [source.key],
          seenExternalIds,
        } as never);
      } catch {
        // best-effort
      }
    }
  }

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
      const reason = ingestBlockReason(reg) ?? "source_blocked";
      skipped.errors.push(reason);
      allStats.push(skipped);
      logIngestionEvent("warn", "source_not_processed", {
        sourceKey: key,
        runId: skipped.runId,
        reason,
      });
    }
  }

  return allStats;
}
