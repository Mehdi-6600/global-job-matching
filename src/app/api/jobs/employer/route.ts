import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

/**
 * Employer job list — ownership by ownerId / postedById only.
 * Never match company solely by email (IDOR risk).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isEmployerRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `jobs_employer_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const jobs = await db.job.findMany({
      where: {
        OR: [
          { postedById: session.user.id },
          { company: { ownerId: session.user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true, logo: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...j,
        location: normalizeLocation(j.location) || j.location,
        applicationCount: j._count.applications,
      })),
    });
  } catch (error) {
    console.error("Employer jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
