import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizePlan, isPlanExpired, getPlanLimits } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/payment/plans";

export type BillingCycle = "monthly" | "yearly";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Add billing period without month-end overflow bugs
 * (e.g. Jan 31 + 1 month → last day of Feb, not March overflow).
 */
export function computePlanExpiry(from: Date, billing: BillingCycle): Date {
  const d = new Date(from.getTime());
  if (billing === "yearly") {
    const y = d.getUTCFullYear() + 1;
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    d.setUTCFullYear(y, m, Math.min(day, lastDay));
    return d;
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  target.setUTCHours(
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
  return target;
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

export function daysUntilExpiry(
  planExpiresAt: Date | null | undefined
): number | null {
  if (!planExpiresAt) return null;
  const ms = planExpiresAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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
  daysRemaining: number | null;
  limits: ReturnType<typeof getPlanLimits>;
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
      daysRemaining: null,
      limits: getPlanLimits("free"),
    };
  }

  const { plan, expired } = resolveEffectivePlan(user);

  if (expired && options?.persistDowngrade) {
    await db.user.update({
      where: { id: userId },
      data: {
        plan: "free",
        planStartedAt: null,
        planExpiresAt: null,
        billingCycle: null,
      },
    });
  }

  return {
    plan,
    planStartedAt: user.planStartedAt,
    planExpiresAt: expired ? null : user.planExpiresAt,
    billingCycle: expired ? null : user.billingCycle,
    expired,
    daysRemaining: expired ? 0 : daysUntilExpiry(user.planExpiresAt),
    limits: getPlanLimits(plan),
  };
}

/**
 * Activate plan after payment is confirmed.
 * Extension policy: max(currentExpiry, now) + duration when still active.
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

  const existing = await client.user.findUnique({
    where: { id: params.userId },
    select: { planExpiresAt: true, plan: true },
  });

  const now = new Date();
  const base =
    existing?.planExpiresAt && existing.planExpiresAt.getTime() > now.getTime()
      ? existing.planExpiresAt
      : now;

  const started = now;
  const expires = computePlanExpiry(base, params.billingCycle);

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

/**
 * Batch-expire paid users whose planExpiresAt is in the past.
 */
export async function expireOverduePlans(
  client: DbClient = db,
  limit = 200
): Promise<{ expiredCount: number; userIds: string[] }> {
  const now = new Date();

  const overdue = await client.user.findMany({
    where: {
      plan: { not: "free" },
      planExpiresAt: { lt: now },
    },
    select: { id: true },
    take: limit,
  });

  if (overdue.length === 0) {
    return { expiredCount: 0, userIds: [] };
  }

  const ids = overdue.map((u) => u.id);

  await client.user.updateMany({
    where: { id: { in: ids } },
    data: {
      plan: "free",
      planStartedAt: null,
      planExpiresAt: null,
      billingCycle: null,
    },
  });

  return { expiredCount: ids.length, userIds: ids };
}
