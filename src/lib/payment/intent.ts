import { db } from "@/lib/db";
import {
  getPlanAmount,
  getCryptoWallet,
  type PlanId,
} from "@/lib/payment/plans";
import {
  fetchUsdRate,
  expectedCryptoFromUsd,
  isRateFresh,
} from "@/lib/payment/rates";

export const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type CreateIntentParams = {
  userId: string;
  planId: PlanId;
  billing: "monthly" | "yearly";
  cryptoType: string;
};

export async function createPaymentIntent(params: CreateIntentParams) {
  const { userId, planId, billing, cryptoType } = params;

  if (planId === "free" || !(planId === "pro" || planId === "business" || planId === "enterprise")) {
    throw Object.assign(new Error("Invalid plan"), { code: "INVALID_PLAN" });
  }

  const wallet = getCryptoWallet(cryptoType);
  if (!wallet) {
    throw Object.assign(
      new Error(`Payments in ${cryptoType} are not configured or not supported`),
      { code: "WALLET_NOT_CONFIGURED" }
    );
  }

  const amountUsd = getPlanAmount(planId, billing);
  if (!(amountUsd > 0)) {
    throw Object.assign(new Error("Invalid plan amount"), {
      code: "INVALID_AMOUNT",
    });
  }

  const rate = await fetchUsdRate(cryptoType);
  if (!isRateFresh(rate.fetchedAt)) {
    throw Object.assign(new Error("Stale exchange rate"), {
      code: "RATE_STALE",
    });
  }

  const expectedCryptoAmount = expectedCryptoFromUsd(amountUsd, rate.rateUsd);
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);

  // Cap open intents per user
  const openCount = await db.paymentIntent.count({
    where: {
      userId,
      status: { in: ["pending", "submitted"] },
      expiresAt: { gt: new Date() },
    },
  });
  if (openCount >= 5) {
    throw Object.assign(
      new Error("Too many open payment intents. Finish or wait for expiry."),
      { code: "TOO_MANY_INTENTS" }
    );
  }

  const intent = await db.paymentIntent.create({
    data: {
      userId,
      planId,
      billingCycle: billing,
      amountUsd,
      cryptoType: wallet.type,
      rateUsd: rate.rateUsd,
      rateSource: rate.source,
      rateFetchedAt: rate.fetchedAt,
      expectedCryptoAmount,
      recipientAddress: wallet.address,
      status: "pending",
      expiresAt,
    },
  });

  return intent;
}

export async function loadValidIntentForUser(
  intentId: string,
  userId: string
) {
  const intent = await db.paymentIntent.findUnique({
    where: { id: intentId },
  });
  if (!intent) return { ok: false as const, code: "INTENT_NOT_FOUND" as const };
  if (intent.userId !== userId) {
    return { ok: false as const, code: "INTENT_FORBIDDEN" as const };
  }
  if (intent.status !== "pending") {
    return { ok: false as const, code: "INTENT_NOT_PENDING" as const };
  }
  if (intent.expiresAt.getTime() <= Date.now()) {
    await db.paymentIntent.updateMany({
      where: { id: intent.id, status: "pending" },
      data: { status: "expired" },
    });
    return { ok: false as const, code: "INTENT_EXPIRED" as const };
  }
  if (!isRateFresh(intent.rateFetchedAt)) {
    return { ok: false as const, code: "RATE_STALE" as const };
  }
  return { ok: true as const, intent };
}
