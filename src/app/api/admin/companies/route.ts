import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "JOB_SEEKER";
    if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companies = await db.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { jobs: true } },
      },
    });

    return NextResponse.json({ companies, count: companies.length });
  } catch (error: any) {
    console.error("Admin companies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "JOB_SEEKER";
    if (role !== ROLES.ADMIN && role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, location, website } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing company id" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;

    const company = await db.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}
