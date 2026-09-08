import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

/**
 * GET /api/me/payments — current user's payment / crypto transaction history.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `me_payments_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20) || 20)
    );

    const transactions = await db.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        planId: true,
        amount: true,
        currency: true,
        cryptoType: true,
        txHash: true,
        status: true,
        type: true,
        billingCycle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error("Me payments error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
