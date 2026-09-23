import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeLocation } from "@/lib/location";
import { createJobForUser } from "@/services/jobs/create-job";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { prismaSalaryOverlapWhere } from "@/lib/jobs/salary-filter";

const MAX_SALARY = 10_000_000; // hard ceiling — absurd values rejected

const salaryNumber = z.coerce
  .number({ invalid_type_error: "Salary must be a number" })
  .finite()
  .int()
  .min(0)
  .max(MAX_SALARY);

const querySchema = z
  .object({
    // Cap deep OFFSET pages (page * limit) without breaking page-based API.
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    type: z.string().max(50).optional(),
    experience: z.string().max(50).optional(),
    remote: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    minSalary: salaryNumber.optional(),
    maxSalary: salaryNumber.optional(),
    tag: z.string().max(50).optional(),
    company: z.string().trim().min(1).max(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.minSalary != null &&
      data.maxSalary != null &&
      data.minSalary > data.maxSalary
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minSalary must be <= maxSalary",
        path: ["minSalary"],
      });
    }
  });

type QueryInput = z.infer<typeof querySchema>;

type JobForMapping = {
  location: string | null;
  company?: { location: string | null } | null;
  [key: string]: unknown;
};

/**
 * Normalizes location strings on job and its nested company.
 * Keeps all other fields untouched.
 */
function mapJob<T extends JobForMapping>(job: T): T {
  return {
    ...job,
    location: normalizeLocation(job.location) || job.location,
    company: job.company
      ? {
          ...job.company,
          location: normalizeLocation(job.company.location),
        }
      : job.company,
  };
}

/**
 * Splits a user query into lowercase tokens.
 * Ignores tokens shorter than 2 chars to avoid noise from "a", "e", "it".
 */
function tokenizeSearch(search: string): string[] {
  return search
    .toLowerCase()
    .split(/[\s,;|/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Very small stopword set — enough to avoid accidental matches from
 * common filler words. Kept intentionally tiny to stay general-purpose.
 */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "job",
  "jobs",
  "role",
  "work",
]);

type RankableJob = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  company: { name: string | null } | null;
};

/**
 * Weighted relevance score. Higher = better.
 * Title match dominates, then company, then tags, then description.
 * Uses token-level matching so multi-word queries behave sensibly.
 */
function relevanceScore(job: RankableJob, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const title = job.title.toLowerCase();
  const companyName = (job.company?.name ?? "").toLowerCase();
  const tagsJoined = job.tags.join(" ").toLowerCase();
  const description = job.description.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (STOPWORDS.has(token)) continue;

    // Title: strongest signal.
    if (title === token) score += 100;
    else if (title.startsWith(token)) score += 60;
    else if (title.includes(token)) score += 40;

    // Company name.
    if (companyName.includes(token)) score += 20;

    // Tags.
    if (tagsJoined.includes(token)) score += 15;

    // Description: weakest, and only if it appears early (first 500 chars).
    // Reduces the "one random mention deep in a wall of text" problem.
    const head = description.slice(0, 500);
    if (head.includes(token)) score += 5;
    else if (description.includes(token)) score += 1;
  }

  return score;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = getRequestIp(req);

    // Public list: allow more than authenticated write paths, still anti-scrape.
    const limited = await ratelimit.limit(`jobs_get_${ip}`);
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const result = querySchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid query",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      search,
      location,
      type,
      experience,
      remote,
      tag,
      company,
      minSalary,
      maxSalary,
    } = result.data;

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { status: "active" };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (type) where.type = type;
    if (experience) where.experience = experience;
    if (remote) where.remote = true;
    if (company) where.companyId = company;
    if (tag) where.tags = { has: tag };

    const salaryWhere = prismaSalaryOverlapWhere({ minSalary, maxSalary });
    if (salaryWhere) {
      // Merge into AND without clobbering existing conditions.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        salaryWhere,
      ];
    }

    const includeClause = {
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          location: true,
        },
      },
      category: {
        select: { id: true, name: true, slug: true, color: true },
      },
    } as const;

    // Without a search term: keep the existing fresh-first behavior exactly.
    if (!search || search.trim().length === 0) {
      const [jobs, total] = await Promise.all([
        db.job.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: includeClause,
        }),
        db.job.count({ where }),
      ]);

      return NextResponse.json({
        jobs: jobs.map(mapJob),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }

    const tokens = tokenizeSearch(search);

    // If the query is too short to tokenize meaningfully, fall back to the
    // existing contains-filter + freshness ordering. No ranking noise.
    if (tokens.length === 0) {
      const [jobs, total] = await Promise.all([
        db.job.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: includeClause,
        }),
        db.job.count({ where }),
      ]);

      return NextResponse.json({
        jobs: jobs.map(mapJob),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }

    // Ranked path: pull a bounded candidate set, score it in memory,
    // sort with a stable tie-breaker, then paginate.
    //
    // Bounded so we never load the entire jobs table.
    // 500 candidates covers deep enough for meaningful ranking at the
    // top of the results without unbounded memory cost.
    const RANK_CANDIDATES = 500;

    const [candidates, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: RANK_CANDIDATES,
        include: includeClause,
      }),
      db.job.count({ where }),
    ]);

    const scored = (candidates as unknown as RankableJob[])
      .map((job) => ({ job, score: relevanceScore(job, tokens) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ta = a.job.createdAt.getTime();
        const tb = b.job.createdAt.getTime();
        if (tb !== ta) return tb - ta;
        return a.job.id < b.job.id ? -1 : a.job.id > b.job.id ? 1 : 0;
      });

    const pageSlice = scored
      .slice(skip, skip + limit)
      .map((row) => row.job as unknown as Parameters<typeof mapJob>[0]);

    return NextResponse.json({
      jobs: pageSlice.map(mapJob),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Jobs GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}

/**
 * Create job — same pipeline as /api/employer/jobs (no plan bypass).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limited = await ratelimit.limit(
      `jobs_post_${session.user.id}_${ip}`,
    );
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      body,
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          details: result.details,
          limit: result.limit,
          used: result.used,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { success: true, job: mapJob(result.job) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
