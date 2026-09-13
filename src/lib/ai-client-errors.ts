/**
 * Map AI API HTTP failures to user-facing messages.
 * Keeps UI consistent across resume / career-risk / roadmap / migration.
 */

export type AiErrorPayload = {
  error?: string;
  code?: string;
  message?: string;
};

type Translate = (key: string, fallback: string) => string;

export function messageFromAiHttpError(
  status: number,
  data: AiErrorPayload | null | undefined,
  t: Translate
): string {
  const code = data?.code || "";
  const serverMsg =
    (typeof data?.error === "string" && data.error.trim()) ||
    (typeof data?.message === "string" && data.message.trim()) ||
    "";

  if (status === 401) {
    return t("Auth.errors.unauthorized", "Please sign in to continue.");
  }

  if (
    status === 503 ||
    code === "RATE_LIMIT_INFRA_ERROR" ||
    code === "QUOTA_INFRA_ERROR"
  ) {
    return t(
      "Common.serviceUnavailable",
      "Service temporarily unavailable. Please try again shortly."
    );
  }

  if (status === 429 || code === "QUOTA_EXCEEDED" || code === "RATE_LIMITED") {
    return (
      serverMsg ||
      t(
        "Common.rateLimited",
        "Too many requests. Please wait and try again."
      )
    );
  }

  if (status === 402 || code === "PLAN_REQUIRED") {
    return (
      serverMsg ||
      t("Common.planRequired", "This feature requires a higher plan.")
    );
  }

  if (status >= 500) {
    return (
      serverMsg ||
      t("Common.error", "Something went wrong. Please try again.")
    );
  }

  return (
    serverMsg || t("Common.error", "Something went wrong. Please try again.")
  );
}
