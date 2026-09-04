import type { PlanId } from "./payment/plans";

export const PLAN_LIMITS: Record<PlanId, Record<string, number>> = {
  free: { maxActiveJobsEmployer: 1, maxSavedJobs: 10 },
  pro: { maxActiveJobsEmployer: 3, maxSavedJobs: 50, aiCalls: 100 },
  business: { maxActiveJobsEmployer: 10, maxSavedJobs: 200, aiCalls: 500 },
  enterprise: { maxActiveJobsEmployer: 50, maxSavedJobs: 1000, aiCalls: 2000 },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

/** Returns remaining quota for a plan (0 if unlimited) */
export function getPlanLimit(
  plan: PlanId | string,
  type: "maxActiveJobsEmployer" | "maxSavedJobs" | "aiCalls" = "maxActiveJobsEmployer"
): number {
  const p = plan.toLowerCase() as PlanId;
  return PLAN_LIMITS[p]?.[type] ?? 0;
}

/** Returns true if plan is expired (or no expiration set) */
export function isPlanExpired(userPlan: string, expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}
