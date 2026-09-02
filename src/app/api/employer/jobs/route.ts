import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { ratelimit } from "@/lib/ratelimit";
import { jobCreateSchema } from "@/lib/validation/job";
import { getPlanLimits } from "@/lib/plan-limits";

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

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...j,
        location: normalizeLocation(j.location) || j.location,
        applicantCount: j._count.applications,
        applicationCount: j._count.applications,
      })),
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

    if (!isEmployerRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `employer_jobs_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = getPlanLimits(user.plan);
    const activeJobs = await db.job.count({
      where: {
        status: "active",
        OR: [
          { postedById: user.id },
          { company: { ownerId: user.id } },
        ],
      },
    });

    if (activeJobs >= limits.maxActiveJobsEmployer) {
      return NextResponse.json(
        {
          error: `Active job limit reached (${limits.maxActiveJobsEmployer}). Upgrade your plan to post more jobs.`,
          code: "PLAN_LIMIT_JOBS",
          limit: limits.maxActiveJobsEmployer,
          used: activeJobs,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = jobCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid input (title, description min 20 chars, location required)",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const location = normalizeLocation(data.location) || data.location;

    let companyId: string | null = data.companyId ?? null;

    if (companyId) {
      const owned = await db.company.findFirst({
        where: { id: companyId, ownerId: session.user.id },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Company not found or not owned by you" },
          { status: 403 }
        );
      }
    } else {
      const existing = await db.company.findFirst({
        where: { ownerId: session.user.id },
      });
      if (existing) {
        companyId = existing.id;
      } else {
        const name = data.companyName?.trim() || "My Company";
        const created = await db.company.create({
          data: {
            name,
            ownerId: session.user.id,
            email: session.user.email || null,
            status: "active",
          },
        });
        companyId = created.id;
      }
    }

    const job = await db.job.create({
      data: {
        title: data.title,
        description: data.description,
        location,
        type: data.type || "Full-time",
        remote: Boolean(data.remote),
        experience: data.experience ?? null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency || "USD",
        requirements: data.requirements ?? [],
        responsibilities: data.responsibilities ?? [],
        benefits: data.benefits ?? [],
        tags: data.tags ?? [],
        deadline: data.deadline ?? null,
        status: "active",
        companyId,
        postedById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

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
