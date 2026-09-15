/**
 * Allowed payment state transitions (enforced in application code).
 * Intent:  pending → submitted | expired | rejected
 *          submitted → confirmed | rejected
 *          confirmed/rejected/expired are terminal
 * Tx:      pending → confirmed | rejected
 *          confirmed/rejected terminal
 */

export type IntentStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "expired";

export type TxStatus = "pending" | "confirmed" | "rejected";

const INTENT_TRANSITIONS: Record<IntentStatus, IntentStatus[]> = {
  pending: ["submitted", "expired", "rejected"],
  submitted: ["confirmed", "rejected"],
  confirmed: [],
  rejected: [],
  expired: [],
};

const TX_TRANSITIONS: Record<TxStatus, TxStatus[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: [],
  rejected: [],
};

export function canTransitionIntent(
  from: string,
  to: string
): boolean {
  const allowed = INTENT_TRANSITIONS[from as IntentStatus];
  if (!allowed) return false;
  return allowed.includes(to as IntentStatus);
}

export function canTransitionTx(from: string, to: string): boolean {
  const allowed = TX_TRANSITIONS[from as TxStatus];
  if (!allowed) return false;
  return allowed.includes(to as TxStatus);
}

export function assertIntentTransition(from: string, to: string): void {
  if (!canTransitionIntent(from, to)) {
    throw Object.assign(
      new Error(`Illegal intent transition ${from} → ${to}`),
      { code: "ILLEGAL_INTENT_TRANSITION" }
    );
  }
}

export function assertTxTransition(from: string, to: string): void {
  if (!canTransitionTx(from, to)) {
    throw Object.assign(
      new Error(`Illegal transaction transition ${from} → ${to}`),
      { code: "ILLEGAL_TX_TRANSITION" }
    );
  }
}
