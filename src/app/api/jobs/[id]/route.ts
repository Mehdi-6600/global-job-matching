import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";

const viewTracker = new Map<string, { count: number; resetAt: number }>();
const VIEW_WINDOW_MS = 60 * 60 * 1000;
const VIEW_MAX_PER_WINDOW = 3;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

function canIncrementView(ip: string, jobId: string): boolean {
  const key = `${ip}:${jobId}`;
  const now = Date.now();
  const record = viewTracker.get(key);
  if (!record || now > record.resetAt) {
    viewTracker.set(key, { count: 1, resetAt: now + VIEW_WINDOW_MS });
    return true;
  }
  if (record.count >= VIEW_MAX_PER_WINDOW) return false;
  record.count++;
  return true;
}

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

    const ip = getClientIp(req);
    let viewCount = job.viewCount;
    if (canIncrementView(ip, id)) {
      await db.job.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
      viewCount += 1;
    }

    const { _count, ...rest } = job;

    return NextResponse.json({
      job: {
        ...rest,
        location: normalizeLocation(job.location) || job.location,
        viewCount,
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
