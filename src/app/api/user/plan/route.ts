import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/subscription";
import { getPlanLimits } from "@/lib/plan-limits";
import { PLAN_PRICES } from "@/lib/payment/plans";

/**
 * Returns the effective plan (respects planExpiresAt).
 * If expired, persists downgrade to free.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const effective = await getEffectivePlan(session.user.id, {
      persistDowngrade: true,
    });

    const limits = getPlanLimits(effective.plan);
    const price =
      effective.plan in PLAN_PRICES
        ? PLAN_PRICES[effective.plan as keyof typeof PLAN_PRICES]
        : 0;

    return NextResponse.json({
      plan: effective.plan,
      planStartedAt: effective.planStartedAt,
      planExpiresAt: effective.planExpiresAt,
      billingCycle: effective.billingCycle,
      expired: effective.expired,
      price,
      limits,
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
