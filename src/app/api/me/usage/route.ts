import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/subscription";
import { getUsageSnapshot } from "@/lib/usage-snapshot";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

/**
 * GET /api/me/usage — detailed quota usage for the signed-in user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `me_usage_${session.user.id}_${ip}`
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
      expired: effective.expired,
      planExpiresAt: effective.planExpiresAt,
      daysRemaining: effective.daysRemaining,
      billingCycle: effective.billingCycle,
      usage,
      upgradePath: "/pricing",
    });
  } catch (error) {
    console.error("Me usage error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
