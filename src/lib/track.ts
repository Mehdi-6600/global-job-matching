/**
 * Lightweight product analytics (fire-and-forget).
 * Uses /api/analytics with path-based event names — no PII in payload.
 */

export type CareerRiskEvent =
  | "career_risk_started"
  | "career_risk_form_completed"
  | "career_risk_auth_gate_shown"
  | "career_risk_google_login"
  | "career_risk_email_login"
  | "career_risk_auth_success"
  | "career_risk_analysis_started"
  | "career_risk_analysis_completed"
  | "career_risk_analysis_failed"
  | "career_risk_result_viewed"
  | "career_risk_share_created"
  | "career_risk_share_viewed"
  | "career_risk_cta_clicked";

export function trackEvent(
  event: CareerRiskEvent | string,
  options?: { referrer?: string | null }
): void {
  if (typeof window === "undefined") return;

  const path = `/event/${encodeURIComponent(event)}`;
  const body = JSON.stringify({
    path,
    referrer: options?.referrer ?? (document.referrer || null),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }
  } catch {
    // fall through
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
