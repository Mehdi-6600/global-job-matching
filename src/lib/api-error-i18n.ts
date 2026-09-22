/**
 * Map API error `code` values to user-facing localized messages.
 *
 * Contract with the API:
 *   Every error body may carry both:
 *     - code:  machine-readable, stable, i18n-agnostic (preferred)
 *     - error: human-readable English fallback (legacy)
 *
 * The client calls this helper first. If a `code` maps to a dictionary
 * key we translate it; otherwise we fall back to the server-provided
 * English string. This keeps backward compatibility while eliminating
 * untranslated English in the UI whenever a code is present.
 */

export type ApiErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  limit?: number;
  used?: number;
  details?: unknown;
};

type TranslateFn = (key: string, fallback?: string) => string;

/**
 * Stable code → dictionary key map.
 * Codes come from `lib/http.ts`, `lib/quota.ts`, and API route bodies.
 */
const CODE_TO_KEY: Record<string, string> = {
  UNAUTHORIZED: "ApiErrors.unauthorized",
  FORBIDDEN: "ApiErrors.forbidden",
  NOT_FOUND: "ApiErrors.notFound",
  VALIDATION_ERROR: "ApiErrors.validation",
  RATE_LIMITED: "ApiErrors.rateLimited",
  INTERNAL_ERROR: "ApiErrors.internal",
  SERVICE_UNAVAILABLE: "ApiErrors.serviceUnavailable",

  // Quota
  PLAN_LIMIT_AI: "ApiErrors.planLimitAi",
  PLAN_LIMIT_APPLICATIONS: "ApiErrors.planLimitApplications",
  PLAN_LIMIT_SAVED_JOBS: "ApiErrors.planLimitSavedJobs",
  PLAN_LIMIT_JOB_ALERTS: "ApiErrors.planLimitJobAlerts",
  PLAN_LIMIT_JOBS: "ApiErrors.planLimitJobs",
  PLAN_REQUIRED: "ApiErrors.planRequired",
  QUOTA_EXCEEDED: "ApiErrors.quotaExceeded",
  QUOTA_INFRA_ERROR: "ApiErrors.quotaInfraError",
  RATE_LIMIT_INFRA_ERROR: "ApiErrors.rateLimitInfraError",

  // Auth / register
  EMAIL_EXISTS: "ApiErrors.emailExists",
  EMAIL_TAKEN: "ApiErrors.emailExists",
  REGISTER_FAILED: "ApiErrors.internal",

  // Jobs / applications
  ALREADY_APPLIED: "ApiErrors.alreadyApplied",
  ALREADY_SAVED: "ApiErrors.alreadySaved",
  JOB_NOT_ACTIVE: "ApiErrors.jobNotActive",
  JOB_NOT_FOUND: "ApiErrors.jobNotFound",

  // AI
  CAREER_RISK_INTERNAL: "ApiErrors.aiFailed",
};

/**
 * Best-effort fallback for HTTP status codes when no `code` is provided.
 */
const STATUS_TO_KEY: Record<number, string> = {
  400: "ApiErrors.badRequest",
  401: "ApiErrors.unauthorized",
  403: "ApiErrors.forbidden",
  404: "ApiErrors.notFound",
  409: "ApiErrors.conflict",
  413: "ApiErrors.tooLarge",
  422: "ApiErrors.unprocessable",
  429: "ApiErrors.rateLimited",
  500: "ApiErrors.internal",
  502: "ApiErrors.serviceUnavailable",
  503: "ApiErrors.serviceUnavailable",
  504: "ApiErrors.serviceUnavailable",
};

/**
 * Resolve a user-facing message for an API error response.
 *
 * Order of preference:
 *   1. Localized message for `code` (if present and known).
 *   2. Localized message for HTTP status (if known).
 *   3. Server-provided `error`/`message` string (English fallback).
 *   4. Localized generic "something went wrong".
 */
export function messageFromApiError(
  status: number,
  data: ApiErrorPayload | null | undefined,
  t: TranslateFn,
): string {
  const code = typeof data?.code === "string" ? data.code : "";

  if (code && CODE_TO_KEY[code]) {
    const fallback = typeof data?.error === "string" ? data.error : "";
    return t(CODE_TO_KEY[code], fallback || "Something went wrong.");
  }

  if (STATUS_TO_KEY[status]) {
    const fallback = typeof data?.error === "string" ? data.error : "";
    return t(STATUS_TO_KEY[status], fallback || "Something went wrong.");
  }

  const serverMsg =
    (typeof data?.error === "string" && data.error.trim()) ||
    (typeof data?.message === "string" && data.message.trim()) ||
    "";

  return serverMsg || t("Common.error", "Something went wrong");
}
