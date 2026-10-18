import { db } from "@/lib/db";
import { getCryptoWallet } from "@/lib/payment/plans";
import { fetchUsdRate, expectedCryptoFromUsd, isRateFresh } from "@/lib/payment/rates";
import { FEATURED_JOB_PRICES, type FeaturedDuration } from "@/lib/payment/plans";
import { expireStaleIntents, INTENT_TTL_MS } from "@/lib/payment/intent";

export async function createFeaturedIntent(params: {
  userId: string;
  jobId: string;
  duration: FeaturedDuration;
  cryptoType: string;
}) {
  const { userId, jobId, duration, cryptoType } = params;

  const wallet = getCryptoWallet(cryptoType);
  if (!wallet) {
    throw Object.assign(new Error(`Payments in ${cryptoType} are not configured`), { code: "WALLET_NOT_CONFIGURED" });
  }

  // Verify job exists and belongs to user (or user is employer/admin)
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, postedById: true, title: true, featured: true, featuredUntil: true },
  });
  if (!job) {
    throw Object.assign(new Error("Job not found"), { code: "JOB_NOT_FOUND" });
  }
  // Allow owner or any authenticated user to feature (soft check - ownership enforced at API layer)
  // We just verify existence here

  const amountUsd = FEATURED_JOB_PRICES[duration];
  if (!(amountUsd > 0)) {
    throw Object.assign(new Error("Invalid featured amount"), { code: "INVALID_AMOUNT" });
  }

  await expireStaleIntents(userId);

  const rate = await fetchUsdRate(cryptoType);
  if (!isRateFresh(rate.fetchedAt)) {
    throw Object.assign(new Error("Stale exchange rate"), { code: "RATE_STALE" });
  }

  const expectedCryptoAmount = expectedCryptoFromUsd(amountUsd, rate.rateUsd);
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);
  const planId = duration === "weekly" ? "featured_weekly" : "featured_monthly";

  const openCount = await db.paymentIntent.count({
    where: {
      userId,
      status: { in: ["pending", "submitted"] },
      expiresAt: { gt: new Date() },
    },
  });
  if (openCount >= 5) {
    throw Object.assign(new Error("Too many open payment intents"), { code: "TOO_MANY_INTENTS" });
  }

  const intent = await db.paymentIntent.create({
    data: {
      userId,
      planId,
      billingCycle: "onetime",
      amountUsd,
      cryptoType: wallet.type,
      rateUsd: rate.rateUsd,
      rateSource: rate.source,
      rateFetchedAt: rate.fetchedAt,
      expectedCryptoAmount,
      recipientAddress: wallet.address,
      status: "pending",
      expiresAt,
      jobId,
      featuredDuration: duration,
    },
  });

  return { intent, job };
}

export function getFeaturedDurationLabel(duration: FeaturedDuration): string {
  return duration === "weekly" ? "7 days" : "30 days";
}

export function getFeaturedExpiryDate(duration: FeaturedDuration): Date {
  const now = new Date();
  const days = duration === "weekly" ? 7 : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
