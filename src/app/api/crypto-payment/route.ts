import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import {
  PLAN_PRICES,
  getCryptoWallets,
  getCryptoWallet,
  getPlanAmount,
  type PlanId,
} from "@/lib/payment/plans";

const cryptoPaymentSchema = z
  .object({
    planId: z.enum(["pro", "business", "enterprise"]),
    txHash: z
      .string()
      .trim()
      .min(10)
      .max(200)
      .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid transaction hash format"),
    cryptoType: z.enum([
      "BTC",
      "ETH",
      "BNB",
      "USDT",
      "DOGE",
      "TON",
      "USDC",
    ]),
    billing: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  })
  .strict();

function normalizeTxHash(hash: string): string {
  return hash.trim();
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallets = getCryptoWallets();
    return NextResponse.json({
      wallets,
      configured: wallets.length > 0,
    });
  } catch (error) {
    console.error("Crypto wallets GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = cryptoPaymentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data", details: result.error.issues },
        { status: 400 }
      );
    }

    const { planId, cryptoType, billing } = result.data;
    const txHash = normalizeTxHash(result.data.txHash);

    const wallet = getCryptoWallet(cryptoType);
    if (!wallet) {
      return NextResponse.json(
        {
          error: `Payments in ${cryptoType} are not configured.`,
          code: "WALLET_NOT_CONFIGURED",
        },
        { status: 400 }
      );
    }

    if (!(planId in PLAN_PRICES) || PLAN_PRICES[planId as PlanId] <= 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const expectedAmount = getPlanAmount(planId as PlanId, billing);

    const pendingCount = await db.transaction.count({
      where: {
        userId: session.user.id,
        status: "pending",
        type: "crypto",
      },
    });
    if (pendingCount >= 5) {
      return NextResponse.json(
        {
          error:
            "You already have too many pending payments. Wait for admin review.",
          code: "TOO_MANY_PENDING",
        },
        { status: 429 }
      );
    }

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
        billingCycle: billing,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Transaction submitted for verification. Plan activates after admin confirmation.",
      payTo: {
        cryptoType: wallet.type,
        address: wallet.address,
        name: wallet.name,
      },
      transaction: {
        id: transaction.id,
        planId: transaction.planId,
        amount: transaction.amount,
        billing,
        billingCycle: transaction.billingCycle,
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
