/**
 * Deterministic source health state machine.
 * DISABLED is never auto-set from failures (admin/manual via enabled=false).
 */
import type { SourceHealth } from "./types";

export const HEALTH_THRESHOLDS = {
  /** consecutiveFailures >= this → FAILING */
  failingAt: 3,
  /** consecutiveFailures >= this → DEGRADED */
  degradedAt: 1,
} as const;

export type HealthInput = {
  enabled: boolean;
  consecutiveFailures: number;
  fetched: number;
  failed: number;
  timedOut: boolean;
  lastError?: string | null;
};

export function computeHealthStatus(input: HealthInput): SourceHealth {
  if (!input.enabled) return "DISABLED";

  const n = Math.max(0, input.consecutiveFailures | 0);

  if (n >= HEALTH_THRESHOLDS.failingAt) return "FAILING";
  if (n >= HEALTH_THRESHOLDS.degradedAt) return "DEGRADED";
  if (input.timedOut) return "DEGRADED";
  if (input.failed > 0 && input.fetched === 0) return "DEGRADED";
  return "HEALTHY";
}
