/**
 * Source health from consecutive failures + last run metrics.
 * One failure does not disable; repeated failures escalate.
 */
import type { SourceHealth } from "./types";

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
  if (input.consecutiveFailures >= 5) return "FAILING";
  if (input.consecutiveFailures >= 2 || input.timedOut) return "DEGRADED";
  if (input.failed > 0 && input.fetched === 0) return "DEGRADED";
  return "HEALTHY";
}
