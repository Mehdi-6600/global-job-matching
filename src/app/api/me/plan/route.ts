import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/subscription";
import { PLAN_PRICES } from "@/lib/payment/plans";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { db } from "@/lib/db";

/**
 * Current user's effective plan + limits + usage snapshot.
 * GET /api/me/plan
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `me_plan_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const effective = await getEffectivePlan(session.user.id, {
      persistDowngrade: true,
    });

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const [applicationsThisMonth, savedJobs, jobAlerts, pendingPayments] =
      await Promise.all([
        db.application.count({
          where: {
            userId: session.user.id,
            createdAt: { gte: monthStart },
          },
        }),
        db.savedJob.count({ where: { userId: session.user.id } }),
        db.jobAlert.count({
          where: { userId: session.user.id, active: true },
        }),
        db.transaction.count({
          where: { userId: session.user.id, status: "pending" },
        }),
      ]);

    return NextResponse.json({
      plan: effective.plan,
      planStartedAt: effective.planStartedAt,
      planExpiresAt: effective.planExpiresAt,
      billingCycle: effective.billingCycle,
      expired: effective.expired,
      daysRemaining: effective.daysRemaining,
      limits: effective.limits,
      usage: {
        applicationsThisMonth,
        savedJobs,
        activeJobAlerts: jobAlerts,
        pendingPayments,
      },
      prices: PLAN_PRICES,
      upgradePath: "/pricing",
    });
  } catch (error) {
    console.error("Me plan error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
