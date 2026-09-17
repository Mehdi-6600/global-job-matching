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

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
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
        },
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
