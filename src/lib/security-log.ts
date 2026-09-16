// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecurityEventType =
  | "admin.role_change"
  | "admin.payment_confirm"
  | "admin.payment_reject"
  | "admin.bootstrap"
  | "admin.job_update"
  | "admin.job_delete"
  | "auth.password_reset"
  | "auth.session_invalidated"
  | "account.delete"
  | "plan.expire";

export type SecurityEventMeta = Record<
  string,
  string | number | boolean | null | undefined
>;

export type SecurityEvent = {
  type: SecurityEventType;
  actorId?: string | null;
  targetId?: string | null;
  meta?: SecurityEventMeta;
  at: string;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * یک خط ممیزی امنیتی ساخت‌یافته برای Vercel Logs / Log Drains.
 *
 * رفتار best-effort: هرگز throw نمی‌کند. مسیرهای حساس ادمین باید
 * بعد از یک mutation موفق این تابع را صدا بزنند تا ردپای forensics
 * در log drainها باقی بماند. هیچ PII‌ای فراتر از شناسه‌هایی که
 * از قبل در سیستم شناخته‌شده‌اند ثبت نمی‌شود.
 */
export function securityLog(
  type: SecurityEventType,
  fields: {
    actorId?: string | null;
    targetId?: string | null;
    meta?: SecurityEventMeta;
  } = {}
): void {
  try {
    const event: SecurityEvent = {
      type,
      actorId: fields.actorId ?? null,
      targetId: fields.targetId ?? null,
      meta: fields.meta,
      at: new Date().toISOString(),
    };

    console.info("[security]", JSON.stringify(event));
  } catch {
    // Best-effort: هرگز نباید مسیر اصلی درخواست را بشکند
    // (مثلاً خطای غیرمنتظرهٔ JSON.stringify روی meta حلقوی).
  }
}
