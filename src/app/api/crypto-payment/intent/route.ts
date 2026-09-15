import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { createPaymentIntent } from "@/lib/payment/intent";
import { getCryptoWallets, PLAN_PRICES } from "@/lib/payment/plans";

const schema = z
  .object({
    planId: z.enum(["pro", "business", "enterprise"]),
    cryptoType: z.enum(["BTC", "ETH", "BNB", "USDT", "DOGE", "USDC"]),
    billing: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  })
  .strict();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      wallets: getCryptoWallets(),
      prices: PLAN_PRICES,
      intentTtlMinutes: 30,
    });
  } catch (error) {
    console.error("Payment intent GET error:", error);
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
      `crypto_intent_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    try {
      const intent = await createPaymentIntent({
        userId: session.user.id,
        planId: parsed.data.planId,
        billing: parsed.data.billing,
        cryptoType: parsed.data.cryptoType,
      });

      return NextResponse.json({
        success: true,
        intent: {
          id: intent.id,
          planId: intent.planId,
          billingCycle: intent.billingCycle,
          amountUsd: intent.amountUsd,
          cryptoType: intent.cryptoType,
          expectedCryptoAmount: intent.expectedCryptoAmount,
          rateUsd: intent.rateUsd,
          rateSource: intent.rateSource,
          recipientAddress: intent.recipientAddress,
          expiresAt: intent.expiresAt,
          status: intent.status,
        },
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const code = err.code || "INTENT_FAILED";
      const status =
        code === "TOO_MANY_INTENTS"
          ? 429
          : code === "RATE_FETCH_FAILED" ||
              code === "RATE_INVALID" ||
              code === "RATE_STALE"
            ? 503
            : 400;
      return NextResponse.json(
        {
          error: err.message || "Could not create payment intent",
          code,
        },
        { status }
      );
    }
  } catch (error) {
    console.error("Payment intent POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
