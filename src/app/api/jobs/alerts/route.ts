import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import {
  jobAlertCreateSchema,
  jobAlertDeleteSchema,
} from "@/lib/validation/job-alert";
import { getPlanLimits } from "@/lib/plan-limits";
import { getEffectivePlan } from "@/lib/subscription";

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

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `job_alerts_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const alerts = await db.jobAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Job alerts GET error:", error);
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
      `job_alerts_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const effective = await getEffectivePlan(user.id);
    const limits = getPlanLimits(effective.plan);
    const alertCount = await db.jobAlert.count({
      where: { userId: user.id },
    });

    if (alertCount >= limits.maxJobAlerts) {
      return NextResponse.json(
        {
          error: `Job alert limit reached (${limits.maxJobAlerts}). Upgrade your plan for more.`,
          code: "PLAN_LIMIT_JOB_ALERTS",
          limit: limits.maxJobAlerts,
          used: alertCount,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = jobAlertCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { keywords, location, remote, type, minSalary } = parsed.data;

    const alert = await db.jobAlert.create({
      data: {
        userId: session.user.id,
        keywords: keywords ?? null,
        location: location ?? null,
        remote: remote ?? null,
        type: type ?? null,
        minSalary: minSalary ?? null,
        active: true,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `job_alerts_delete_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const id = new URL(req.url).searchParams.get("id");
    const parsed = jobAlertDeleteSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const result = await db.jobAlert.deleteMany({
      where: { id: parsed.data.id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
