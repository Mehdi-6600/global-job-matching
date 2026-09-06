import type { Prisma } from "@prisma/client";
import { getPlanLimits, type PlanId } from "@/lib/plan-limits";

type Tx = Prisma.TransactionClient;

export type UsageKind =
  | "ai_career_risk"
  | "ai_resume"
  | "ai_other";

export type QuotaDenied = {
  ok: false;
  status: 403;
  error: string;
  code: string;
  limit: number;
  used: number;
};

export type QuotaOk = {
  ok: true;
  used: number;
  limit: number;
  usageEventId?: string;
};

function monthStartUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function monthPeriodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Serialize quota checks per user inside a transaction */
export async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

function aiLimitForPlan(plan: PlanId | string, kind: UsageKind): number {
  const limits = getPlanLimits(plan);
  // Prefer dedicated fields when present; fall back safely
  const anyLimits = limits as Record<string, unknown>;
  if (kind === "ai_career_risk") {
    if (typeof anyLimits.maxCareerRiskPerMonth === "number") {
      return anyLimits.maxCareerRiskPerMonth as number;
    }
    if (typeof anyLimits.maxAiCareerRiskPerMonth === "number") {
      return anyLimits.maxAiCareerRiskPerMonth as number;
    }
  }
  if (kind === "ai_resume") {
    if (typeof anyLimits.maxResumeGenerationsPerMonth === "number") {
      return anyLimits.maxResumeGenerationsPerMonth as number;
    }
  }
  if (typeof anyLimits.maxAiRequestsPerMonth === "number") {
    return anyLimits.maxAiRequestsPerMonth as number;
  }
  // Sensible defaults
  const p = String(plan || "free").toLowerCase();
  if (p === "enterprise") return 200;
  if (p === "business") return 100;
  if (p === "pro") return 30;
  return 3;
}

export async function assertAndReserveAiUsage(
  tx: Tx,
  params: {
    userId: string;
    plan: PlanId | string;
    kind: UsageKind;
    meta?: string | null;
  }
): Promise<QuotaOk | QuotaDenied> {
  const limit = aiLimitForPlan(params.plan, params.kind);
  const periodKey = monthPeriodKey();

  const used = await tx.usageEvent.count({
    where: {
      userId: params.userId,
      kind: params.kind,
      periodKey,
    },
  });

  if (used >= limit) {
    return {
      ok: false,
      status: 403,
      error: `Monthly AI limit reached (${limit}). Upgrade your plan or try next month.`,
      code: "PLAN_LIMIT_AI",
      limit,
      used,
    };
  }

  const event = await tx.usageEvent.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      periodKey,
      meta: params.meta ?? null,
    },
    select: { id: true },
  });

  return { ok: true, used: used + 1, limit, usageEventId: event.id };
}

/** Release only the reservation created by this request (race-safe) */
export async function releaseUsageEventById(
  tx: Tx,
  params: { userId: string; usageEventId: string }
): Promise<void> {
  await tx.usageEvent.deleteMany({
    where: {
      id: params.usageEventId,
      userId: params.userId,
    },
  });
}

/**
 * @deprecated Prefer releaseUsageEventById — deleting "latest" is racy under concurrency.
 */
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
