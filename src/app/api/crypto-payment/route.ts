import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import {
  PLAN_PRICES,
  getCryptoWallets,
  getCryptoWallet,
  type PlanId,
} from "@/lib/payment/plans";
import { getRequestIp } from "@/lib/client-ip";
import {
  isPlausibleTxHash,
  verifyTxOnChain,
} from "@/lib/payment/verify-crypto";
import { getEffectivePlan } from "@/lib/subscription";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { loadValidIntentForUser } from "@/lib/payment/intent";

const cryptoPaymentSchema = z
  .object({
    paymentIntentId: z.string().min(1),
    txHash: z
      .string()
      .trim()
      .min(10)
      .max(200)
      .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid transaction hash format"),
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
    const effective = await getEffectivePlan(session.user.id, {
      persistDowngrade: true,
    });

    return NextResponse.json({
      wallets,
      configured: wallets.length > 0,
      currentPlan: effective,
      prices: PLAN_PRICES,
      requiresIntent: true,
      intentPath: "/api/crypto-payment/intent",
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

    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(
      `crypto_pay_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = cryptoPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const txHash = normalizeTxHash(parsed.data.txHash);
    const intentLoad = await loadValidIntentForUser(
      parsed.data.paymentIntentId,
      session.user.id
    );
    if (!intentLoad.ok) {
      return NextResponse.json(
        {
          error: "Payment intent is invalid or expired. Create a new quote.",
          code: intentLoad.code,
        },
        { status: 400 }
      );
    }

    const intent = intentLoad.intent;
    const cryptoType = intent.cryptoType;

    if (!isPlausibleTxHash(cryptoType, txHash)) {
      return NextResponse.json(
        {
          error: "Transaction hash format is not valid for the selected crypto",
          code: "INVALID_TX_HASH",
        },
        { status: 400 }
      );
    }

    const wallet = getCryptoWallet(cryptoType);
    if (!wallet || wallet.address !== intent.recipientAddress) {
      return NextResponse.json(
        {
          error: "Recipient wallet no longer matches intent. Create a new quote.",
          code: "RECIPIENT_MISMATCH",
        },
        { status: 400 }
      );
    }

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
        {
          error: "Transaction hash already used",
          code: "DUPLICATE_TX",
        },
        { status: 409 }
      );
    }

    const chain = await verifyTxOnChain({
      asset: cryptoType,
      txHash,
    });

    if (chain.status === "failed") {
      return NextResponse.json(
        {
          error:
            "This transaction failed on-chain and cannot be used for payment.",
          code: "TX_FAILED_ON_CHAIN",
          chainVerification: chain,
        },
        { status: 400 }
      );
    }

    const amountUsd = Number(intent.amountUsd);
    const expectedCrypto = Number(intent.expectedCryptoAmount);
    const rateUsd = Number(intent.rateUsd);

    const transaction = await db.$transaction(async (prisma) => {
      const claimed = await prisma.paymentIntent.updateMany({
        where: {
          id: intent.id,
          userId: session.user.id,
          status: "pending",
        },
        data: { status: "submitted" },
      });
      if (claimed.count !== 1) {
        throw Object.assign(new Error("Intent already used"), {
          code: "INTENT_ALREADY_USED",
        });
      }

      const created = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          planId: intent.planId,
          amount: amountUsd,
          currency: "USD",
          cryptoType,
          txHash,
          status: "pending",
          type: "crypto",
          billingCycle: intent.billingCycle,
          paymentIntentId: intent.id,
          recipientAddress: intent.recipientAddress,
          expectedCryptoAmount: expectedCrypto,
          rateUsd,
        },
      });

      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { transactionId: created.id },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message:
        "Transaction submitted for verification. Plan activates after admin confirmation of on-chain payment.",
      payTo: {
        cryptoType: wallet.type,
        address: wallet.address,
        name: wallet.name,
        expectedCryptoAmount: expectedCrypto,
        amountUsd,
      },
      chainVerification: {
        status: chain.status,
        found: chain.found,
        note: chain.note,
        source: chain.source ?? null,
      },
      transaction: {
        id: transaction.id,
        planId: transaction.planId,
        amount: transaction.amount,
        billingCycle: transaction.billingCycle,
        status: transaction.status,
        cryptoType: transaction.cryptoType,
        paymentIntentId: intent.id,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "INTENT_ALREADY_USED") {
      return NextResponse.json(
        { error: "This payment intent was already used", code: err.code },
        { status: 409 }
      );
    }
    console.error("Crypto payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
