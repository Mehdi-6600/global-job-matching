/**
 * Outreach dedup helpers — pure, testable.
 */

export const OUTREACH_WINDOW_DAYS = 7;

export function normalizeCompanyKey(name: string, website: string | null | undefined): string {
  const raw = (website || name || "").trim().toLowerCase();
  return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

export const OUTREACH_COOLDOWN_MS = OUTREACH_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function getCooldownCutoff(now = new Date()): Date {
  return new Date(now.getTime() - OUTREACH_COOLDOWN_MS);
}

export function isInCooldown(lastSentAt: Date | null | undefined, now = new Date()): boolean {
  if (!lastSentAt) return false;
  return now.getTime() - lastSentAt.getTime() < OUTREACH_COOLDOWN_MS;
}

// Deprecated fixed-bucket helpers kept for backward compat (not used for cooldown)
export function getWindowStart(date = new Date()): string {
  const ms = date.getTime();
  const daysSinceEpoch = Math.floor(ms / (24 * 60 * 60 * 1000));
  const windowIndex = Math.floor(daysSinceEpoch / OUTREACH_WINDOW_DAYS);
  const windowStartMs = windowIndex * OUTREACH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return new Date(windowStartMs).toISOString().slice(0, 10);
}

export function buildWindowKey(companyKey: string, windowStart: string): string {
  return `${companyKey}:${windowStart}`;
}
