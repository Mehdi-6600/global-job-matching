/**
 * Source circuit breaker (CLOSED → OPEN → HALF_OPEN → CLOSED).
 * State derived from JobSource consecutiveFailures + lastErrorAt.
 * DISABLED sources stay out of the circuit (admin gate).
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export const CIRCUIT_DEFAULTS = {
  /** consecutiveFailures to open circuit */
  openAt: 5,
  /** ms after last error before HALF_OPEN probe allowed */
  cooldownMs: 15 * 60 * 1000,
} as const;

export type CircuitInput = {
  enabled: boolean;
  consecutiveFailures: number;
  lastErrorAt: Date | string | null | undefined;
  now?: Date;
  openAt?: number;
  cooldownMs?: number;
};

export function evaluateCircuit(input: CircuitInput): {
  state: CircuitState;
  allowRequest: boolean;
  reason: string;
} {
  if (!input.enabled) {
    return { state: "OPEN", allowRequest: false, reason: "source_disabled" };
  }

  const openAt = input.openAt ?? CIRCUIT_DEFAULTS.openAt;
  const cooldownMs = input.cooldownMs ?? CIRCUIT_DEFAULTS.cooldownMs;
  const failures = Math.max(0, input.consecutiveFailures | 0);
  const now = input.now ?? new Date();

  if (failures < openAt) {
    return { state: "CLOSED", allowRequest: true, reason: "ok" };
  }

  const last =
    input.lastErrorAt == null
      ? null
      : typeof input.lastErrorAt === "string"
        ? new Date(input.lastErrorAt)
        : input.lastErrorAt;

  if (!last || Number.isNaN(last.getTime())) {
    return { state: "OPEN", allowRequest: false, reason: "circuit_open" };
  }

  const elapsed = now.getTime() - last.getTime();
  if (elapsed >= cooldownMs) {
    return {
      state: "HALF_OPEN",
      allowRequest: true,
      reason: "circuit_half_open_probe",
    };
  }

  return {
    state: "OPEN",
    allowRequest: false,
    reason: "circuit_open_cooldown",
  };
}
