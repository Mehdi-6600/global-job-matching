import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchFromArbeitnow } from "@/lib/jobs/fetcher";
import { env } from "@/lib/env";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import {
  parseLocation,
  mapJobType,
  stripHtml,
  generateSlug,
  guessCurrency,
  guessExperience,
} from "@/lib/jobs/sync-normalize";

const MAX_PAGES = 5; // Arbeitnow pages (≤100 jobs each)
const PER_PAGE = 100;
const SOURCE_KEY = "arbeitnow";
const SYNC_DATE = new Date().toISOString().slice(0, 10);

/** Sync timeout guard: prevent runaway invocations (Vercel/serverless). */
const MAX_EXECUTION_MS = 55_000;
const startedAt = Date.now();

type ArbeitnowJob = {
  slug?: string;
  url?: string;
  title: string;
  description?: string;
  company_name: string;
  location?: string;
  remote?: boolean;
  tags?: string[];
  job_types?: string[];
};

type SyncStats = {
  created: number;
  updated: number;
  skipped: number;
  totalFetched: number;
};

function isAuthorized(request: NextRequest): boolean {
  if (isAuthorizedBearerSecret(request, env.SYNC_SECRET)) return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isAuthorizedBearerSecret(request, cronSecret)) return true;

  return false;
}

function externalIdFor(job: ArbeitnowJob): string {
  const slug = job.slug?.trim();
  if (slug) return `${SOURCE_KEY}:${slug}`;

  const url = job.url?.trim();
  if (url) return `${SOURCE_KEY}:url:${url.slice(0, 180)}`;

  return `${SOURCE_KEY}:unknown:${Date.now()}`;
}

/** Safe location string; falls back to "Remote". */
function buildLocation(city: string, country: string): string {
  const joined = `${city}, ${country}`.replace(/^,\s*|,\s*$/g, "").trim();
  return joined || "Remote";
}

/** Deduplicate and sanitize tag arrays. */
function buildTags(job: ArbeitnowJob): string[] {
  const raw = [
    ...(job.tags ?? []),
    job.url ?? "",
    `source:${SOURCE_KEY}`,
    `synced:${SYNC_DATE}`,
  ];
  return Array.from(
    new Set(raw.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean))
  );
}

/** True when we've exceeded the execution budget. */
function isTimedOut(): boolean {
  return Date.now() - startedAt > MAX_EXECUTION_MS;
}

async function resolveCompany(job: ArbeitnowJob) {
  const existing = await db.company.findFirst({
    where: { name: job.company_name },
  });
  if (existing) return existing;

  const slug =
    generateSlug(job.company_name) ||
    `company-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return db.company.create({
    data: {
      name: job.company_name,
      slug,
      email: env.OWNER_EMAIL,
      location: job.location?.trim() || "Remote",
      status: "verified",
    },
  });
}

async function upsertJob(
  job: ArbeitnowJob,
  stats: SyncStats
): Promise<void> {
  const externalId = externalIdFor(job);
  const { city, country } = parseLocation(job.location || "");
  const jobType = mapJobType(job.job_types?.[0] || "full_time");
  const plainDescription = stripHtml(job.description || "") || job.title;
  const currency = guessCurrency(job.location || "", country);
  const experience = guessExperience(
    job.title || "",
    job.tags || [],
    plainDescription
  );

  const company = await resolveCompany(job);
  const tags = buildTags(job);

  const existing = await db.job.findFirst({
    where: {
      OR: [
        { externalId },
        ...(job.url ? [{ tags: { has: job.url } }] : []),
      ],
    },
    select: { id: true },
  });

  const payload = {
    title: job.title,
    description: plainDescription,
    location: buildLocation(city, country),
    remote: job.remote ?? false,
    type: jobType,
    experience,
    currency,
    requirements: job.tags ?? [],
    tags,
    status: "active" as const,
    companyId: company.id,
    externalId,
  };

  if (existing) {
    await db.job.update({ where: { id: existing.id }, data: payload });
    stats.updated++;
  } else {
    await db.job.create({
      data: {
        ...payload,
        responsibilities: [],
        benefits: [],
      },
    });
    stats.created++;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats: SyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    totalFetched: 0,
  };

  let pagesScanned = 0;
  let timedOut = false;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (isTimedOut()) {
        timedOut = true;
        break;
      }

      const jobs = (await fetchFromArbeitnow({
        page,
        perPage: PER_PAGE,
      })) as ArbeitnowJob[];

      if (!jobs.length) break;

      pagesScanned++;
      stats.totalFetched += jobs.length;

      for (const job of jobs) {
        if (isTimedOut()) {
          timedOut = true;
          break;
        }

        try {
          await upsertJob(job, stats);
        } catch (jobError) {
          stats.skipped++;
          console.error(
            `[sync] Failed to upsert job "${job.title}" (${job.slug ?? job.url}):`,
            jobError
          );
        }
      }

      if (timedOut || jobs.length < PER_PAGE) break;
    }

    return NextResponse.json({
      success: true,
      ...stats,
      pagesScanned,
      timedOut,
    });
  } catch (error) {
    console.error("[sync] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        ...stats,
        pagesScanned,
        timedOut,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
