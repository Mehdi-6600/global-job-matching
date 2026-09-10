export type SecurityEventType =
  | "admin.role_change"
  | "admin.payment_confirm"
  | "admin.payment_reject"
  | "admin.bootstrap"
  | "auth.password_reset"
  | "auth.session_invalidated"
  | "account.delete"
  | "plan.expire";

export type SecurityEvent = {
  type: SecurityEventType;
  actorId?: string | null;
  targetId?: string | null;
  meta?: Record<string, string | number | boolean | null | undefined>;
  at: string;
};

/**
 * Structured security audit line for Vercel logs / log drains.
 * No PII beyond ids already known to the system.
 */
export function securityLog(
  type: SecurityEventType,
  fields: {
    actorId?: string | null;
    targetId?: string | null;
    meta?: Record<string, string | number | boolean | null | undefined>;
  } = {}
): void {
  const event: SecurityEvent = {
    type,
    actorId: fields.actorId ?? null,
    targetId: fields.targetId ?? null,
    meta: fields.meta,
    at: new Date().toISOString(),
  };

  console.info("[security]", JSON.stringify(event));
}
