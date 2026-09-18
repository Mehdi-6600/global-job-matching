/**
 * Central ingestion pipeline — adapters feed drafts; this layer
 * quality-gates, dedups, and persists. Never mutates employer jobs.
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
import { getEnabledSources, isProductionIngestAllowed, SOURCE_REGISTRY } from "./registry";
import { arbeitnowAdapter } from "./adapters/arbeitnow";
import type { IngestJobDraft, IngestStats, JobSourceAdapter } from "./types";

const ADAPTERS: Record<string, JobSourceAdapter> = {
  arbeitnow: arbeitnowAdapter,
};

const MAX_EXECUTION_MS = 55_000;
const MAX_PAGES_PER_SOURCE = 5;

function isTimedOut(started: number): boolean {
  return Date.now() - started > MAX_EXECUTION_MS;
}

async function resolveCompany(name: string, location: string) {
  const slug = generateSlug(name) || `company-${Date.now()}`;
  const existing = await db.company.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
  });
  if (existing) return existing;
  return db.company.create({
    data: {
      name: name.slice(0, 200),
      slug: `${slug}-${Date.now().toString(36)}`,
      location: location.slice(0, 200) || "Remote",
      status: "verified",
    },
  });
}

async function findDedupCandidate(draft: IngestJobDraft): Promise<ExistingJobRef | null> {
  // Level 1: externalId
  const byExt = await db.job.findFirst({
    where: {
      externalId: draft.externalId,
      postedById: null,
    },
    select: {
      id: true,
      externalId: true,
      externalUrl: true,
      title: true,
      location: true,
      postedById: true,
      company: { select: { name: true } },
    },
  });
  if (byExt) {
    return {
      id: byExt.id,
      externalId: byExt.externalId,
      externalUrl: byExt.externalUrl,
      title: byExt.title,
      location: byExt.location,
      postedById: byExt.postedById,
      companyName: byExt.company?.name,
    };
  }

  // Level 2/3: URL match among imported jobs only
  if (draft.applyUrl || draft.externalUrl) {
    const url = draft.applyUrl || draft.externalUrl!;
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
    if (byUrl) {
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
      if (match && match.confidence >= 0.9) return ref;
    }
  }

  return null;
}

async function persistDraft(draft: IngestJobDraft, stats: IngestStats): Promise<void> {
  const quality = assessJobQuality(draft);
  if (!quality.ok) {
    stats.qualityRejected++;
    stats.skipped++;
    return;
  }
  stats.validated++;

  const existing = await findDedupCandidate(draft);
  if (existing) {
    const match = scoreDedup(draft, existing);
    if (match && match.confidence >= 0.9) {
      // Employer protection already enforced via postedById: null queries
      const occ = inferOccupation(draft.title);
      const { city, country } = parseLocation(draft.location);
      await db.job.update({
        where: { id: existing.id },
        data: {
          title: draft.title,
          description: draft.description,
          location: `${city}, ${country}`.replace(/^,\s*|,\s*$/g, "").trim() || "Remote",
          remote: draft.remote,
          type: mapJobType(draft.employmentType),
          externalUrl: draft.externalUrl,
          applyUrl: draft.applyUrl,
          source: draft.sourceKey,
          externalId: draft.externalId,
          lastSeenAt: new Date(),
          lastVerifiedAt: new Date(),
          freshnessStatus: "fresh",
          descriptionIsSnippet: draft.descriptionIsSnippet,
          qualityScore: quality.score,
          occupation: occ.occupation,
          occupationFamily: occ.occupationFamily,
          seniority: occ.seniority,
          attribution: draft.attribution,
          tags: Array.from(
            new Set([
              ...draft.tags,
              `source:${draft.sourceKey}`,
              `synced:${new Date().toISOString().slice(0, 10)}`,
            ])
          ),
        },
      });
      stats.updated++;
      return;
    }
    stats.duplicates++;
    stats.skipped++;
    return;
  }

  const company = await resolveCompany(draft.company, draft.location);
  const { city, country } = parseLocation(draft.location);
  const occ = inferOccupation(draft.title);
  const now = new Date();

  await db.job.create({
    data: {
      title: draft.title,
      description: draft.description,
      location: `${city}, ${country}`.replace(/^,\s*|,\s*$/g, "").trim() || "Remote",
      remote: draft.remote,
      type: mapJobType(draft.employmentType),
      experience: guessExperience(draft.title, draft.tags, draft.description),
      currency: draft.currency || guessCurrency(draft.location, country),
      salaryMin: draft.salaryMin ?? null,
      salaryMax: draft.salaryMax ?? null,
      salary: draft.salaryText ?? null,
      requirements: draft.skills.slice(0, 40),
      responsibilities: [],
      benefits: [],
      tags: Array.from(
        new Set([
          ...draft.tags,
          `source:${draft.sourceKey}`,
          `synced:${now.toISOString().slice(0, 10)}`,
        ])
      ),
      status: "active",
      companyId: company.id,
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
      occupation: occ.occupation,
      occupationFamily: occ.occupationFamily,
      seniority: occ.seniority,
      attribution: draft.attribution,
      expiresAt: draft.expiresAt ?? null,
    },
  });
  stats.created++;
}

export async function runIngestion(options?: {
  sourceKeys?: string[];
  maxPages?: number;
}): Promise<IngestStats[]> {
  const started = Date.now();
  const enabled = getEnabledSources().filter((s) => {
    if (options?.sourceKeys?.length) return options.sourceKeys.includes(s.key);
    return true;
  });

  const allStats: IngestStats[] = [];

  for (const source of enabled) {
    if (!isProductionIngestAllowed(source)) continue;
    const adapter = ADAPTERS[source.key];
    if (!adapter) {
      allStats.push({
        sourceKey: source.key,
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
        errors: ["adapter_missing"],
      });
      continue;
    }

    const stats: IngestStats = {
      sourceKey: source.key,
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
      errors: [],
    };

    const maxPages = options?.maxPages ?? MAX_PAGES_PER_SOURCE;
    try {
      for (let page = 1; page <= maxPages; page++) {
        if (isTimedOut(started)) {
          stats.timedOut = true;
          break;
        }
        const result = await adapter.fetchPage({ page, perPage: 100 });
        stats.fetched += result.fetched;
        stats.errors.push(...result.errors);
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
              e instanceof Error ? e.message.slice(0, 200) : "persist_error"
            );
          }
        }
        if (!result.hasMore) break;
      }
    } catch (e) {
      stats.failed++;
      stats.errors.push(e instanceof Error ? e.message : "source_failed");
    }

    stats.finishedAt = new Date().toISOString();
    stats.durationMs = Date.now() - new Date(stats.startedAt).getTime();
    allStats.push(stats);
  }

  // Record registry keys that were skipped due to license
  for (const s of SOURCE_REGISTRY) {
    if (!isProductionIngestAllowed(s) && options?.sourceKeys?.includes(s.key)) {
      allStats.push({
        sourceKey: s.key,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        fetched: 0,
        validated: 0,
        created: 0,
        updated: 0,
        duplicates: 0,
        skipped: 0,
        qualityRejected: 0,
        failed: 0,
        timedOut: false,
        errors: [`license_blocked:${s.licenseStatus}`],
      });
    }
  }

  return allStats;
}
