import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { PLAN_PRICES } from "@/lib/payment/plans";
import { z } from "zod";

const paymentSchema = z
  .object({
    planId: z.enum(["free", "pro", "business", "enterprise"]),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
    const amount = PLAN_PRICES[planId];

    if (amount === 0) {
      await db.user.update({
        where: { id: session.user.id },
        data: { plan: planId },
      });
      return NextResponse.json({
        success: true,
        message: "Free plan activated",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Online payment not configured. Use crypto payment or contact support.",
        planId,
        amount,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
