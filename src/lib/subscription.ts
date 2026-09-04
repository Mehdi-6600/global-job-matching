import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizePlan, isPlanExpired } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/payment/plans";

export type BillingCycle = "monthly" | "yearly";

type DbClient = Prisma.TransactionClient | PrismaClient;

export function computePlanExpiry(from: Date, billing: BillingCycle): Date {
  const d = new Date(from);
  if (billing === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/** Pure — safe inside transactions */
export function resolveEffectivePlan(user: {
  plan: string | null | undefined;
  planExpiresAt?: Date | null;
}): { plan: PlanId; expired: boolean } {
  const normalized = normalizePlan(user.plan);
  const expired =
    normalized !== "free" && isPlanExpired(user.planExpiresAt ?? null);

  if (expired) {
    return { plan: "free", expired: true };
  }
  return { plan: normalized, expired: false };
}

export async function getEffectivePlan(
  userId: string,
  options?: { persistDowngrade?: boolean }
): Promise<{
  plan: PlanId;
  planStartedAt: Date | null;
  planExpiresAt: Date | null;
  billingCycle: string | null;
  expired: boolean;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planStartedAt: true,
      planExpiresAt: true,
      billingCycle: true,
    },
  });

  if (!user) {
    return {
      plan: "free",
      planStartedAt: null,
      planExpiresAt: null,
      billingCycle: null,
      expired: false,
    };
  }

  const { plan, expired } = resolveEffectivePlan(user);

  if (expired && options?.persistDowngrade) {
    await db.user.update({
      where: { id: userId },
      data: {
        plan: "free",
        billingCycle: null,
      },
    });
  }

  return {
    plan,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    billingCycle: user.billingCycle,
    expired,
  };
}

/**
 * Activate plan after admin confirms payment.
 * Pass `tx` when inside db.$transaction so plan + payment stay atomic.
 */
export async function activatePlanForUser(
  params: {
    userId: string;
    planId: string;
    billingCycle: BillingCycle;
  },
  client: DbClient = db
) {
  const plan = normalizePlan(params.planId);
  if (plan === "free") {
    return client.user.update({
      where: { id: params.userId },
      data: {
        plan: "free",
        planStartedAt: null,
        planExpiresAt: null,
        billingCycle: null,
      },
    });
  }

  const started = new Date();
  const expires = computePlanExpiry(started, params.billingCycle);

  return client.user.update({
    where: { id: params.userId },
    data: {
      plan,
      planStartedAt: started,
      planExpiresAt: expires,
      billingCycle: params.billingCycle,
    },
  });
}
