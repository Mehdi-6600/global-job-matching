import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";

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

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(20).max(20000),
  location: z.string().min(2).max(200),
  type: z.string().min(1).max(50),
  remote: z.boolean().optional().default(false),
  experience: z.string().max(50).optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  currency: z.string().max(10).optional().default("USD"),
  requirements: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  companyId: z.string().optional().nullable(),
  companyName: z.string().min(2).max(200).optional(),
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (![ROLES.EMPLOYER, ROLES.ADMIN, ROLES.OWNER].includes(role as any)) {
      return NextResponse.json(
        { error: "Only employers can post jobs" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let companyId = data.companyId || null;

    if (!companyId) {
      const companyName = data.companyName || "My Company";
      const existing = await db.company.findFirst({
        where: { ownerId: session.user.id },
      });

      if (existing) {
        companyId = existing.id;
      } else {
        const created = await db.company.create({
          data: {
            name: companyName,
            ownerId: session.user.id,
            email: session.user.email || null,
            status: "active",
          },
        });
        companyId = created.id;
      }
    }

    const cleanLocation =
      normalizeLocation(data.location) || data.location.trim();

    const job = await db.job.create({
      data: {
        title: data.title,
        description: data.description,
        location: cleanLocation,
        type: data.type,
        remote: data.remote ?? false,
        experience: data.experience || null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency || "USD",
        requirements: data.requirements || [],
        responsibilities: data.responsibilities || [],
        benefits: data.benefits || [],
        tags: data.tags || [],
        status: "active",
        companyId,
        postedById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, job: mapJob(job) }, { status: 201 });
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
