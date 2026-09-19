/**
 * Source health from consecutive failures + last run metrics.
 * One failure does not disable; repeated failures escalate.
 */

export type HealthStatus = "HEALTHY" | "DEGRADED" | "FAILING" | "DISABLED";

export type HealthInput = {
  enabled: boolean;
  consecutiveFailures: number;
  fetched: number;
  failed: number;
  timedOut: boolean;
  lastError?: string | null;
};

export function computeHealthStatus(input: HealthInput): HealthStatus {
  if (!input.enabled) return "DISABLED";
  if (input.consecutiveFailures >= 5) return "FAILING";
  if (input.consecutiveFailures >= 2 || input.timedOut) return "DEGRADED";
  if (input.failed > 0 && input.fetched === 0) return "DEGRADED";
  return "HEALTHY";
}
