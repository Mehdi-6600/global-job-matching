/**
 * Canonical application statuses for the whole app.
 * Create uses "pending". Legacy "applied" maps to pending.
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
  shortlisted: "viewed",
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

export function isApplicationStatus(
  value: string
): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function applicationStatusLabel(status: string): string {
  const n = normalizeApplicationStatus(status) || status;
  const labels: Record<string, string> = {
    pending: "Pending",
    viewed: "Viewed",
    interview: "Interview",
    rejected: "Rejected",
    hired: "Hired",
  };
  return labels[n] || status;
}
