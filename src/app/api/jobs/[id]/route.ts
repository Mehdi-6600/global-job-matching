import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            location: true,
            logo: true,
            description: true,
            website: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
        postedBy: { select: { id: true, name: true } },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Reliable across serverless instances: always persist increment in DB
    const updated = await db.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    const { _count, ...rest } = job;

    return NextResponse.json({
      job: {
        ...rest,
        location: normalizeLocation(job.location) || job.location,
        viewCount: updated.viewCount,
        applicantCount: _count.applications,
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        benefits: job.benefits || [],
        tags: job.tags || [],
        company: job.company
          ? {
              ...job.company,
              location: normalizeLocation(job.company.location),
            }
          : {
              id: "",
              name: "Unknown Company",
              location: null,
              logo: null,
              description: null,
              website: null,
            },
      },
    });
  } catch (error) {
    console.error("Job get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const job = await db.job.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = job.company?.ownerId === session.user.id;
    const isPoster = job.postedById === session.user.id;
    const isAdmin =
      session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const allowed = [
      "title",
      "description",
      "location",
      "salary",
      "type",
      "remote",
      "experience",
      "salaryMin",
      "salaryMax",
      "currency",
      "requirements",
      "responsibilities",
      "benefits",
      "tags",
      "deadline",
      "status",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    if (typeof data.location === "string") {
      data.location = normalizeLocation(data.location) || data.location;
    }

    const updated = await db.job.update({ where: { id }, data });
    return NextResponse.json({
      success: true,
      job: {
        ...updated,
        location: normalizeLocation(updated.location) || updated.location,
      },
    });
  } catch (error) {
    console.error("Job patch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const job = await db.job.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = job.company?.ownerId === session.user.id;
    const isPoster = job.postedById === session.user.id;
    const isAdmin =
      session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
