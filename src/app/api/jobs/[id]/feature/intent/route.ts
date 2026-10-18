import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { createFeaturedIntent } from "@/lib/payment/featured";
import { getCryptoWallets, FEATURED_JOB_PRICES } from "@/lib/payment/plans";

const schema = z.object({
  duration: z.enum(["weekly", "monthly"]),
  cryptoType: z.enum(["BTC", "ETH", "BNB", "USDT", "DOGE", "USDC"]),
}).strict();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({
    jobId: id,
    prices: FEATURED_JOB_PRICES,
    wallets: getCryptoWallets(),
    intentTtlMinutes: 30,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: jobId } = await params;
    if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(`featured_intent_${session.user.id}_${ip}`);
    if (!limit.success) return rateLimitedResponse(limit, "Too many requests");

    const body = await readJsonBody(req);
    if (body === null) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    try {
      const { intent, job } = await createFeaturedIntent({
        userId: session.user.id,
        jobId,
        duration: parsed.data.duration,
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
          jobId: intent.jobId,
          featuredDuration: intent.featuredDuration,
        },
        job: { id: job.id, title: job.title },
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const code = err.code || "INTENT_FAILED";
      const status = code === "TOO_MANY_INTENTS" ? 429 : code === "RATE_FETCH_FAILED" || code === "RATE_INVALID" || code === "RATE_STALE" ? 503 : code === "JOB_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message || "Could not create featured intent", code }, { status });
    }
  } catch (error) {
    console.error("Featured intent POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
