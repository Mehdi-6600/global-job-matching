import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { PLAN_PRICES, type PlanId } from "@/lib/payment/plans";
import { activatePlanForUser } from "@/lib/subscription";
import { z } from "zod";
import { getRequestIp } from "@/lib/client-ip";

const paymentSchema = z
  .object({
    planId: z.enum(["free", "pro", "business", "enterprise"]),
  })
  .strict();

/**
 * Card/online payment is not integrated.
 * Free plan can be activated here.
 * Paid plans must go through /api/crypto-payment + admin confirm.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `payment_${session.user.id}_${ip}`
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

    const result = paymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { planId } = result.data;
    const amount = PLAN_PRICES[planId as PlanId];

    if (amount === 0 || planId === "free") {
      await activatePlanForUser({
        userId: session.user.id,
        planId: "free",
        billingCycle: "monthly",
      });
      return NextResponse.json({
        success: true,
        message: "Free plan activated",
        plan: "free",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Online card payment is not available. Use crypto payment on the Pricing page, then wait for admin confirmation.",
        code: "USE_CRYPTO",
        redirect: "/pricing",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
