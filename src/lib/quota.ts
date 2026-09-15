import type { Prisma, PrismaClient } from "@prisma/client";
import { getPlanLimits, type PlanId } from "@/lib/plan-limits";

type Tx = Prisma.TransactionClient | PrismaClient;

export type UsageKind =
  | "ai_resume"
  | "ai_career_risk"
  | "ai_roadmap"
  | "ai_migration"
  | "application"
  | "saved_job"
  | "job_alert";

/** Shared monthly pool for every AI generation endpoint */
const AI_KINDS: UsageKind[] = [
  "ai_resume",
  "ai_career_risk",
  "ai_roadmap",
  "ai_migration",
];

export type QuotaOk = {
  ok: true;
  used: number;
  limit: number;
  usageEventId?: string;
};

export type QuotaDenied = {
  ok: false;
  status: number;
  error: string;
  code: string;
  limit: number;
  used: number;
};

function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function monthPeriodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isAiUsageKind(kind: string): kind is UsageKind {
  return (AI_KINDS as string[]).includes(kind);
}

/** Serialize quota checks per user inside a transaction */
export async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

function aiLimitForPlan(plan: PlanId | string): number {
  return getPlanLimits(plan).maxAiGenerationsPerMonth;
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
  if (!isAiUsageKind(params.kind)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid AI usage kind",
      code: "INVALID_USAGE_KIND",
      limit: 0,
      used: 0,
    };
  }

  const limit = aiLimitForPlan(params.plan);
  const periodKey = monthPeriodKey();

  const used = await tx.usageEvent.count({
    where: {
      userId: params.userId,
      kind: { in: AI_KINDS },
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

/** Read-only snapshot for UI / debugging */
export async function getAiQuotaSnapshot(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<{ used: number; limit: number; periodKey: string }> {
  const limit = aiLimitForPlan(params.plan);
  const periodKey = monthPeriodKey();
  const used = await tx.usageEvent.count({
    where: {
      userId: params.userId,
      kind: { in: AI_KINDS },
      periodKey,
    },
  });
  return { used, limit, periodKey };
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
