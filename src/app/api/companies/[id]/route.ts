import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const company = await db.company.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        jobs: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ company });
  } catch (error) {
    console.error("Company get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = company.ownerId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updated = await db.company.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.website !== undefined && { website: body.website }),
      },
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error) {
    console.error("Company patch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = company.ownerId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Company delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
