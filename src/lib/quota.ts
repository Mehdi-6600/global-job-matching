import type { Prisma, PrismaClient } from "@prisma/client";
import { getPlanLimits } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/payment/plans";

type Tx = Prisma.TransactionClient | PrismaClient;

export type UsageKind =
  | "ai_resume"
  | "ai_career_risk"
  | "application"
  | "saved_job"
  | "job_alert";

export type QuotaDenied = {
  ok: false;
  status: 403;
  error: string;
  code: string;
  limit: number;
  used: number;
};

export type QuotaOk = { ok: true; used: number; limit: number };

/** Lock user row — must run inside interactive $transaction on PostgreSQL */
export async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.$queryRaw`
    SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE
  `;
}

export function monthPeriodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthStartUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Reserve one monthly AI usage slot (ledger-based).
 * Call inside $transaction after lockUserRow.
 * Only count successful AI generations — create UsageEvent when reserving;
 * if AI fails afterward, call releaseUsageEvent.
 */
export async function assertAndReserveAiUsage(
  tx: Tx,
  params: {
    userId: string;
    plan: PlanId | string;
    kind: "ai_resume" | "ai_career_risk";
    meta?: string;
  }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxAiGenerationsPerMonth;
  const start = monthStartUtc();
  const periodKey = monthPeriodKey();

  const used = await tx.usageEvent.count({
    where: {
      userId: params.userId,
      kind: params.kind,
      createdAt: { gte: start },
    },
  });

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      error: `AI limit reached this month (${limit}). Upgrade your plan for more.`,
      code: "PLAN_LIMIT_AI",
      limit,
      used,
    };
  }

  await tx.usageEvent.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      periodKey,
      meta: params.meta ?? null,
    },
  });

  return { ok: true, used: used + 1, limit };
}

export async function releaseLatestUsageEvent(
  tx: Tx,
  params: { userId: string; kind: UsageKind }
): Promise<void> {
  const latest = await tx.usageEvent.findFirst({
    where: { userId: params.userId, kind: params.kind },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    await tx.usageEvent.delete({ where: { id: latest.id } });
  }
}

/** Monthly application quota — count real Application rows */
export async function assertApplicationQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxApplicationsPerMonth;
  const start = monthStartUtc();

  const used = await tx.application.count({
    where: {
      userId: params.userId,
      createdAt: { gte: start },
    },
  });

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      error: `Monthly application limit reached (${limit}). Upgrade your plan for more.`,
      code: "PLAN_LIMIT_APPLICATIONS",
      limit,
      used,
    };
  }

  return { ok: true, used, limit };
}

/** Lifetime saved-job quota */
export async function assertSavedJobQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxSavedJobs;

  const used = await tx.savedJob.count({
    where: { userId: params.userId },
  });

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      error: `Saved jobs limit reached (${limit}). Upgrade your plan for more.`,
      code: "PLAN_LIMIT_SAVED_JOBS",
      limit,
      used,
    };
  }

  return { ok: true, used, limit };
}

/** Lifetime job-alert quota */
export async function assertJobAlertQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxJobAlerts;

  const used = await tx.jobAlert.count({
    where: { userId: params.userId },
  });

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      error: `Job alert limit reached (${limit}). Upgrade your plan for more.`,
      code: "PLAN_LIMIT_JOB_ALERTS",
      limit,
      used,
    };
  }

  return { ok: true, used, limit };
}
