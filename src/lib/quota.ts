import type { Prisma, PrismaClient } from "@prisma/client";
import { getPlanLimits, type PlanId } from "@/lib/plan-limits";

/**
 * نوع کمکی برای کلاینت Prisma.
 * درون تراکنش‌های تعاملی (interactive transaction) نوع `Prisma.TransactionClient`
 * و در بیرون از آن `PrismaClient` استفاده می‌شود.
 */
type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * انواع رویدادهای مصرفی که در سیستم سهمیه ردیابی می‌شوند.
 */
export type UsageKind =
  | "ai_resume"
  | "ai_career_risk"
  | "ai_roadmap"
  | "ai_migration"
  | "application"
  | "saved_job"
  | "job_alert";

/**
 * دسته‌ی سهمیه‌های مبتنی بر هوش مصنوعی.
 * این‌ها در یک سهمیه‌ی مشترک ماهانه شمارش می‌شوند.
 */
const AI_KINDS: UsageKind[] = [
  "ai_resume",
  "ai_career_risk",
  "ai_roadmap",
  "ai_migration",
];

/**
 * نتیجه‌ی موفق رزرو سهمیه.
 */
export type QuotaOk = {
  ok: true;
  used: number;
  limit: number;
  usageEventId?: string;
};

/**
 * نتیجه‌ی رد شدن درخواست به دلیل اتمام سهمیه.
 */
export type QuotaDenied = {
  ok: false;
  status: number;
  error: string;
  code: string;
  limit: number;
  used: number;
};

/**
 * مقادیر پیش‌فرض تراکنش تعاملی Prisma (maxWait≈۲ ثانیه، timeout≈۵ ثانیه)
 * در شرایطی که تأخیر شبکه با دیتابیس بالا باشد (بیش از ۱ ثانیه) و
 * روی `FOR UPDATE` منتظر بمانیم، شکست می‌خورند.
 * این بودجه‌ها فقط برای رزرو/آزادسازی سهمیه هستند — هرگز برای فراخوانی AI.
 */
export const QUOTA_TX_MAX_WAIT_MS = 10_000;
export const QUOTA_TX_TIMEOUT_MS = 15_000;

/**
 * ابتدای ماه جاری به وقت UTC را برمی‌گرداند.
 */
function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * کلید دوره‌ی ماهانه به فرمت `YYYY-MM` برمی‌گرداند.
 * به‌صورت پیش‌فرض از تاریخ جاری استفاده می‌کند.
 */
export function monthPeriodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * بررسی می‌کند که آیا نوع مصرف داده‌شده از نوع سهمیه‌ی AI است یا خیر.
 */
export function isAiUsageKind(kind: string): kind is UsageKind {
  return (AI_KINDS as string[]).includes(kind);
}

/**
 * ردیف کاربر را در دیتابیس قفل می‌کند تا از رقابت همزمان (race condition)
 * روی محاسبه‌ی سهمیه جلوگیری شود.
 */
export async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

/**
 * سقف مجاز تولید AI را بر اساس پلن کاربر برمی‌گرداند.
 */
function aiLimitForPlan(plan: PlanId | string): number {
  return getPlanLimits(plan).maxAiGenerationsPerMonth;
}

/**
 * بررسی و رزرو سهمیه‌ی AI.
 *
 * این تابع باید درون یک تراکنش فراخوانی شود که کاربر را قبلاً قفل کرده است.
 * ابتدا تعداد مصرف ماه جاری را می‌شمارد، سپس در صورت مجاز بودن،
 * یک رویداد مصرف جدید ایجاد می‌کند.
 */
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

/**
 * آزادسازی یک رویداد مصرف بر اساس شناسه.
 * معمولاً برای rollback پس از شکست عملیات AI استفاده می‌شود.
 */
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
 * ثبت خطاهای زیرساختی مربوط به سهمیه در لاگ.
 */
export function logQuotaInfraError(context: string, err: unknown): void {
  const e = err as {
    code?: string;
    message?: string;
    meta?: Record<string, unknown>;
    name?: string;
  };
  console.error("[quota-infra]", {
    context,
    name: e?.name,
    code: e?.code,
    message:
      typeof e?.message === "string"
        ? e.message.slice(0, 240)
        : String(err).slice(0, 240),
    meta: e?.meta ? JSON.stringify(e.meta).slice(0, 200) : undefined,
  });
}

/**
 * تشخیص خطاهای قابل‌تلاش مجدد در تراکنش‌های Prisma.
 * شامل تایم‌اوت، deadlock و خطاهای سریال‌سازی.
 */
function isRetryableTxError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = e?.code || "";
  const msg = (e?.message || "").toLowerCase();
  return (
    code === "P2028" ||
    code === "P2034" ||
    code === "P1008" ||
    code === "P1017" ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("deadlock") ||
    msg.includes("could not serialize")
  );
}

type DbClient = {
  $transaction: PrismaClient["$transaction"];
};

/**
 * قفل کاربر + رزرو سهمیه‌ی AI در یک تراکنش زمان‌بندی‌شده.
 * هیچ فراخوانی شبکه یا AI درون این تراکنش انجام نمی‌شود.
 * در صورت بروز خطای گذرا، یک بار به‌صورت خودکار تلاش مجدد می‌شود.
 */
export async function reserveAiUsageInTransaction(
  db: DbClient,
  params: {
    userId: string;
    plan: PlanId | string;
    kind: UsageKind;
    meta?: string | null;
  }
): Promise<QuotaOk | QuotaDenied> {
  const run = async () =>
    db.$transaction(
      async (tx) => {
        const t0 = Date.now();
        await lockUserRow(tx, params.userId);
        const lockMs = Date.now() - t0;

        const t1 = Date.now();
        const result = await assertAndReserveAiUsage(tx, params);

        console.info("[quota-reserve]", {
          kind: params.kind,
          lockMs,
          reserveMs: Date.now() - t1,
          ok: result.ok,
          code: result.ok ? undefined : (result as QuotaDenied).code,
        });

        return result;
      },
      {
        maxWait: QUOTA_TX_MAX_WAIT_MS,
        timeout: QUOTA_TX_TIMEOUT_MS,
      }
    );

  try {
    return await run();
  } catch (err) {
    logQuotaInfraError("reserve_attempt_1", err);
    if (!isRetryableTxError(err)) throw err;

    // تأخیر تصادفی کوتاه قبل از تلاش مجدد برای کاهش تداخل
    await new Promise((r) =>
      setTimeout(r, 150 + Math.floor(Math.random() * 200))
    );

    try {
      return await run();
    } catch (err2) {
      logQuotaInfraError("reserve_attempt_2", err2);
      throw err2;
    }
  }
}

/**
 * آزادسازی سهمیه در یک تراکنش جداگانه.
 * خطاها فقط لاگ می‌شوند و باعث شکست عملیات اصلی نمی‌شوند.
 */
export async function releaseUsageInTransaction(
  db: DbClient,
  params: { userId: string; usageEventId: string }
): Promise<void> {
  try {
    await db.$transaction(
      async (tx) => {
        await releaseUsageEventById(tx, params);
      },
      {
        maxWait: QUOTA_TX_MAX_WAIT_MS,
        timeout: QUOTA_TX_TIMEOUT_MS,
      }
    );
  } catch (err) {
    logQuotaInfraError("release", err);
  }
}

/**
 * وضعیت فعلی سهمیه‌ی AI کاربر را برمی‌گرداند.
 */
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

/**
 * بررسی سهمیه‌ی درخواست‌های شغلی (Applications) در ماه جاری.
 */
export async function assertApplicationQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxApplicationsPerMonth;
  const start = monthStartUtc();

  const used = await tx.application.count({
    where: { userId: params.userId, createdAt: { gte: start } },
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

/**
 * بررسی سهمیه‌ی مشاغل ذخیره‌شده (Saved Jobs).
 */
export async function assertSavedJobQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxSavedJobs;

  const used = await tx.savedJob.count({ where: { userId: params.userId } });

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

/**
 * بررسی سهمیه‌ی هشدارهای شغلی (Job Alerts).
 */
export async function assertJobAlertQuota(
  tx: Tx,
  params: { userId: string; plan: PlanId | string }
): Promise<QuotaOk | QuotaDenied> {
  const limits = getPlanLimits(params.plan);
  const limit = limits.maxJobAlerts;

  const used = await tx.jobAlert.count({ where: { userId: params.userId } });

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
