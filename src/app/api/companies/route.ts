import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (![ROLES.EMPLOYER, ROLES.ADMIN, ROLES.OWNER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, location, website } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Valid company name required" }, { status: 400 });
    }

    const company = await db.company.create({
      data: {
        name: name.trim(),
        description: description || null,
        location: location || null,
        website: website || null,
        ownerId: session.user.id,
        email: session.user.email || null,
      },
    });

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error("Company create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      db.company.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { id: true, name: true } } },
      }),
      db.company.count(),
    ]);

    return NextResponse.json({
      companies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Companies fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
