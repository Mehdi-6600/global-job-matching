import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const cryptoSchema = z.object({
  planId: z.enum(["pro", "business", "enterprise"]),
  txHash: z.string().min(10).max(200),
  cryptoType: z.enum(["BTC", "ETH", "USDT", "USDC"]),
});

const PLAN_PRICES = {
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
    const result = cryptoSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { planId, txHash, cryptoType } = result.data;
    const expectedAmount = PLAN_PRICES[planId];

    const existingTx = await db.transaction.findUnique({ where: { txHash } });
    if (existingTx) {
      return NextResponse.json({ error: "Transaction hash already used" }, { status: 409 });
    }

    const transaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        planId,
        amount: expectedAmount,
        currency: "USD",
        cryptoType,
        txHash,
        status: "pending",
        type: "crypto",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Transaction submitted for verification. Will be activated within 24 hours.",
      transaction,
    });
  } catch (error) {
    console.error("Crypto payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
