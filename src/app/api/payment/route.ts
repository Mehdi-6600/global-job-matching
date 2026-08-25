import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  planId: z.enum(["free", "pro", "business", "enterprise"]),
});

const PLAN_PRICES = {
  free: 0,
  pro: 9,
  business: 29,
  enterprise: 99,
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = paymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { planId } = result.data;
    const amount = PLAN_PRICES[planId];

    if (amount === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { plan: planId },
      });
      return NextResponse.json({ success: true, message: "Free plan activated" });
    }

    return NextResponse.json({
      success: false,
      message: "Online payment not configured. Use crypto payment or contact support.",
      planId,
      amount,
    }, { status: 501 });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
