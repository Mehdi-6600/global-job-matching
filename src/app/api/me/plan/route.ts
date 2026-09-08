import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/subscription";
import { PLAN_PRICES } from "@/lib/payment/plans";
import { getUsageSnapshot } from "@/lib/usage-snapshot";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

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

    const usage = await getUsageSnapshot(session.user.id, effective.plan);

    return NextResponse.json({
      plan: effective.plan,
      planStartedAt: effective.planStartedAt,
      planExpiresAt: effective.planExpiresAt,
      billingCycle: effective.billingCycle,
      expired: effective.expired,
      daysRemaining: effective.daysRemaining,
      limits: effective.limits,
      usage: {
        applicationsThisMonth: usage.applications.used,
        savedJobs: usage.savedJobs.used,
        activeJobAlerts: usage.jobAlerts.used,
        aiGenerationsThisMonth: usage.aiGenerations.used,
        activeEmployerJobs: usage.activeEmployerJobs.used,
        pendingPayments: usage.pendingPayments,
        detailed: usage,
      },
      prices: PLAN_PRICES,
      upgradePath: "/pricing",
    });
  } catch (error) {
    console.error("Me plan error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
