import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      ![ROLES.EMPLOYER, ROLES.ADMIN, ROLES.OWNER].includes(
        session.user.role as any
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, location, website } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Valid company name required" },
        { status: 400 }
      );
    }

    const company = await db.company.create({
      data: {
        name: name.trim(),
        description: description || null,
        location: normalizeLocation(location) || location || null,
        website: website || null,
        ownerId: session.user.id,
        email: session.user.email || null,
      },
    });

    return NextResponse.json({
      success: true,
      company: {
        ...company,
        location: normalizeLocation(company.location),
      },
    });
  } catch (error) {
    console.error("Company create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() || "";

    const where: any = { status: "active" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [companies, total] = await Promise.all([
      db.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, name: true } },
          _count: {
            select: {
              jobs: { where: { status: "active" } },
            },
          },
        },
      }),
      db.company.count({ where }),
    ]);

    const serialized = companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      email: c.email,
      website: c.website,
      location: normalizeLocation(c.location),
      description: c.description,
      logo: c.logo,
      status: c.status,
      createdAt: c.createdAt,
      owner: c.owner,
      activeJobs: c._count.jobs,
    }));

    return NextResponse.json({
      companies: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Companies fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
