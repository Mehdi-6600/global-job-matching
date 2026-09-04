import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { applicationCreateSchema } from "@/lib/validation/application";
import { normalizeLocation } from "@/lib/location";
import { getPlanLimits } from "@/lib/plan-limits";
import { getEffectivePlan } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `applications_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const applications = await db.application.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        coverLetter: true,
        resume: true,
        createdAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            remote: true,
            type: true,
            salary: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            status: true,
            deadline: true,
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
                location: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const result = applications.map((application) => ({
      id: application.id,
      status: application.status,
      coverLetter: application.coverLetter,
      resume: application.resume,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      job: application.job
        ? {
            id: application.job.id,
            title: application.job.title,
            location:
              normalizeLocation(application.job.location) ||
              application.job.location,
            remote: application.job.remote,
            type: application.job.type,
            salary: application.job.salary,
            salaryMin: application.job.salaryMin,
            salaryMax: application.job.salaryMax,
            currency: application.job.currency,
            status: application.job.status,
            deadline: application.job.deadline,
            company: application.job.company
              ? {
                  id: application.job.company.id,
                  name: application.job.company.name,
                  logo: application.job.company.logo,
                  location:
                    normalizeLocation(application.job.company.location) ||
                    application.job.company.location,
                }
              : null,
            category: application.job.category,
          }
        : null,
    }));

    return NextResponse.json({
      applications: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `apply_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const effective = await getEffectivePlan(user.id);
    const limits = getPlanLimits(effective.plan);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const appsThisMonth = await db.application.count({
      where: {
        userId: user.id,
        createdAt: { gte: monthStart },
      },
    });

    if (appsThisMonth >= limits.maxApplicationsPerMonth) {
      return NextResponse.json(
        {
          error: `Monthly application limit reached (${limits.maxApplicationsPerMonth}). Upgrade your plan for more.`,
          code: "PLAN_LIMIT_APPLICATIONS",
          limit: limits.maxApplicationsPerMonth,
          used: appsThisMonth,
        },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = applicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { jobId, coverLetter } = parsed.data;

    const job = await db.job.findUnique({
      where: { id: jobId, status: "active" },
      select: {
        id: true,
        title: true,
        postedById: true,
        deadline: true,
        company: {
          select: {
            ownerId: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or no longer active." },
        { status: 404 }
      );
    }

    if (job.deadline && job.deadline.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This job application deadline has passed." },
        { status: 400 }
      );
    }

    const existing = await db.application.findUnique({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this job." },
        { status: 409 }
      );
    }

    const applicantName = user.name || user.email || "A candidate";
    const companyName = job.company?.name;
    const notifyUserId = job.company?.ownerId || job.postedById;

    const result = await db.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          userId: session.user.id,
          jobId,
          coverLetter: coverLetter?.trim() || null,
          status: "pending",
        },
        select: {
          id: true,
          userId: true,
          jobId: true,
          status: true,
          coverLetter: true,
          resume: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (notifyUserId && notifyUserId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: notifyUserId,
            type: "application",
            title: "New application received",
            message: `${applicantName} applied for "${job.title}"${
              companyName ? ` at ${companyName}` : ""
            }.`,
            actionUrl: "/employer/applications",
          },
        });
      }

      return application;
    });

    return NextResponse.json(
      { success: true, application: result },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "You have already applied for this job." },
        { status: 409 }
      );
    }
    console.error("Application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}
