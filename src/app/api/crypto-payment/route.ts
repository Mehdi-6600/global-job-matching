import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const cryptoSchema = z.object({
  planId: z.enum(["pro", "business", "enterprise"]),
  txHash: z
    .string()
    .min(10)
    .max(200)
    .transform((s) => s.trim()),
  cryptoType: z.enum(["BTC", "ETH", "BNB", "USDT", "DOGE", "TON", "USDC"]),
  amount: z.number().optional(),
  currency: z.string().optional(),
});

const PLAN_PRICES: Record<string, number> = {
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

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `crypto_pay_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = cryptoSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.issues },
        { status: 400 }
      );
    }

    const { planId, txHash, cryptoType } = result.data;
    const expectedAmount = PLAN_PRICES[planId];

    // Never auto-activate paid plan here
    const existingTx = await db.transaction.findUnique({
      where: { txHash },
    });
    if (existingTx) {
      return NextResponse.json(
        { error: "Transaction hash already used" },
        { status: 409 }
      );
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
      message:
        "Transaction submitted for verification. Plan activates after admin confirmation.",
      transaction: {
        id: transaction.id,
        planId: transaction.planId,
        status: transaction.status,
        cryptoType: transaction.cryptoType,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Crypto payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
