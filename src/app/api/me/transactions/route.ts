import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

/**
 * Current user's payment / crypto transaction history.
 * GET /api/me/transactions
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `me_tx_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const transactions = await db.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
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

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Me transactions error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
