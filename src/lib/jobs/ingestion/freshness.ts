/**
 * Freshness lifecycle for imported jobs.
 * Absence-based stale/expire ONLY after a FULL successful source sync.
 */
import type { FreshnessStatus, SyncCompleteness } from "./types";

export type FreshnessPolicy = {
  freshMs: number;
  agingMs: number;
  staleMs: number;
  expireMs: number;
};

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  freshMs: 3 * 24 * 60 * 60 * 1000,
  agingMs: 10 * 24 * 60 * 60 * 1000,
  staleMs: 21 * 24 * 60 * 60 * 1000,
  expireMs: 45 * 24 * 60 * 60 * 1000,
};

export function computeFreshnessStatus(
  lastSeenAt: Date | null | undefined,
  now = new Date(),
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): FreshnessStatus {
  if (!lastSeenAt) return "stale";
  const age = now.getTime() - lastSeenAt.getTime();
  if (age <= policy.freshMs) return "fresh";
  if (age <= policy.agingMs) return "aging";
  if (age <= policy.staleMs) return "stale";
  if (age <= policy.expireMs) return "expired";
  return "archived";
}

export function mayApplyAbsenceFreshness(
  completeness: SyncCompleteness,
): boolean {
  return completeness === "FULL";
}
