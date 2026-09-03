import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { ratelimit } from "@/lib/ratelimit";
import { createJobForUser } from "@/services/jobs/create-job";
import { getEmployerActiveJobLimit } from "@/lib/plan-limits";

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isEmployerRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `employer_jobs_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true },
    });

    const maxActive = getEmployerActiveJobLimit(user?.plan);

    const jobs = await db.job.findMany({
      where: {
        OR: [
          { postedById: session.user.id },
          { company: { ownerId: session.user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });

    const activeCount = jobs.filter((j) => j.status === "active").length;

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...j,
        location: normalizeLocation(j.location) || j.location,
        applicantCount: j._count.applications,
        applicationCount: j._count.applications,
      })),
      plan: {
        name: user?.plan || "free",
        maxActiveJobsEmployer: maxActive,
        activeJobs: activeCount,
        remaining: Math.max(0, maxActive - activeCount),
        atLimit: activeCount >= maxActive,
      },
    });
  } catch (error) {
    console.error("Employer jobs GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `employer_jobs_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      body
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          details: result.details,
          limit: result.limit,
          used: result.used,
        },
        { status: result.status }
      );
    }

    const job = result.job;
    return NextResponse.json(
      {
        success: true,
        job: {
          ...job,
          location: normalizeLocation(job.location) || job.location,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Employer jobs POST error:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
