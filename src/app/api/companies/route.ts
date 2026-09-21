import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";

/* ------------------------------------------------------------------ */
/* Query schema — for GET /api/companies (public list)                */
/* ------------------------------------------------------------------ */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
});

/* ------------------------------------------------------------------ */
/* Create-company schema — used by POST (owner or admin)              */
/* ------------------------------------------------------------------ */
const createCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),
    location: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .optional(),
    website: z
      .string()
      .trim()
      .url()
      .max(500)
      .nullable()
      .optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* GET /api/companies — public list of active companies               */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limited = await ratelimit.limit(`companies_get_${ip}`);
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = listQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { page, limit, search, location } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: "active",
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    const [companies, total] = await Promise.all([
      db.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          website: true,
          location: true,
          description: true,
          logo: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              jobs: {
                where: { status: "active" },
              },
            },
          },
        },
      }),
      db.company.count({ where }),
    ]);

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        email: c.email,
        website: c.website,
        location: normalizeLocation(c.location) || c.location,
        size: null,
        description: c.description,
        logo: c.logo,
        status: c.status,
        createdAt: c.createdAt,
        activeJobs: c._count.jobs,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Companies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/companies — create a company (employer or admin)         */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limited = await ratelimit.limit(
      `companies_post_${session.user.id}_${ip}`
    );
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = createCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, location, website } = parsed.data;

    const existing = await db.company.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "You already own a company. Edit your existing company instead.",
          code: "COMPANY_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const slugTaken = baseSlug
      ? await db.company.findUnique({
          where: { slug: baseSlug },
          select: { id: true },
        })
      : null;

    const slug = slugTaken
      ? `${baseSlug}-${Date.now().toString(36).slice(-6)}`
      : baseSlug || null;

    const company = await db.company.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        location: location
          ? normalizeLocation(location) || location.trim()
          : null,
        website: website?.trim() || null,
        ownerId: session.user.id,
        email: session.user.email || null,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        website: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, company },
      { status: 201 }
    );
  } catch (error) {
    console.error("Companies POST error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
