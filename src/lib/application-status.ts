/**
 * Canonical application statuses for the whole app.
 * Create uses "pending". Legacy "applied" is accepted as alias of pending.
 */
export const APPLICATION_STATUSES = [
  "pending",
  "viewed",
  "interview",
  "rejected",
  "hired",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const ALIASES: Record<string, ApplicationStatus> = {
  applied: "pending",
  pending: "pending",
  viewed: "viewed",
  interview: "interview",
  rejected: "rejected",
  hired: "hired",
};

export function normalizeApplicationStatus(
  input: unknown
): ApplicationStatus | null {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase();
  return ALIASES[key] ?? null;
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}
