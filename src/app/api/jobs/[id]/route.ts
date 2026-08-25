import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const job = await db.job.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, location: true, logo: true } },
        postedBy: { select: { id: true, name: true } },
      },
    });

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ip = getClientIp(req);
    if (canIncrementView(ip, id)) {
      await db.job.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      job.viewCount += 1;
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Job get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const job = await db.job.findUnique({ where: { id }, include: { company: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = job.company?.ownerId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updated = await db.job.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error("Job patch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const job = await db.job.findUnique({ where: { id }, include: { company: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = job.company?.ownerId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
