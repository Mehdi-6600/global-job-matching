import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { createJobForUser } from "@/services/jobs/create-job";

const querySchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  search: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  experience: z.string().max(50).optional(),
  remote: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  tag: z.string().max(50).optional(),
  company: z.string().optional(),
});

function mapJob(job: any) {
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const result = querySchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid query",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
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
    } = result.data;

    const skip = (page - 1) * limit;
    const where: any = { status: "active" };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (type) where.type = type;
    if (experience) where.experience = experience;
    if (remote) where.remote = true;
    if (company) where.companyId = company;
    if (tag) where.tags = { has: tag };

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: {
            select: { id: true, name: true, logo: true, location: true },
          },
          category: { select: { name: true, slug: true } },
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
    console.error("Jobs fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Legacy alias — same security as POST /api/employer/jobs
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      body
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
        { status: result.status }
      );
    }

    return NextResponse.json(
      { success: true, job: mapJob(result.job) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
