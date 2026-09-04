import { db } from "@/lib/db";
import { normalizePlan, isPlanExpired } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/payment/plans";

export type BillingCycle = "monthly" | "yearly";

export function computePlanExpiry(
  from: Date,
  billing: BillingCycle
): Date {
  const d = new Date(from);
  if (billing === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/**
 * Effective plan: if paid plan is past planExpiresAt → treat as free.
 * Does not write to DB (lazy enforcement). Optional side-effect: pass write=true to persist free.
 */
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

  const normalized = normalizePlan(user.plan);
  const expired =
    normalized !== "free" && isPlanExpired(user.planExpiresAt);

  if (expired) {
    if (options?.persistDowngrade) {
      await db.user.update({
        where: { id: userId },
        data: {
          plan: "free",
          billingCycle: null,
        },
      });
    }
    return {
      plan: "free",
      planStartedAt: user.planStartedAt,
      planExpiresAt: user.planExpiresAt,
      billingCycle: user.billingCycle,
      expired: true,
    };
  }

  return {
    plan: normalized,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    billingCycle: user.billingCycle,
    expired: false,
  };
}

/** Activate plan after admin confirms payment (call inside a transaction client if needed). */
export async function activatePlanForUser(params: {
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
}) {
  const plan = normalizePlan(params.planId);
  if (plan === "free") {
    return db.user.update({
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

  return db.user.update({
    where: { id: params.userId },
    data: {
      plan,
      planStartedAt: started,
      planExpiresAt: expires,
      billingCycle: params.billingCycle,
    },
  });
}
