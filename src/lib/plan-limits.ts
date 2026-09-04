import type { PlanId } from "@/lib/payment/plans";

const PAID = new Set(["pro", "business", "enterprise"]);

export function isPaidPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return PAID.has(plan.toLowerCase());
}

export function normalizePlan(plan: string | null | undefined): PlanId {
  const p = (plan || "free").toLowerCase();
  if (p === "pro" || p === "business" || p === "enterprise") return p;
  return "free";
}

/**
 * Product model:
 * - free / pro → job-seeker oriented; employers still get a small posting quota
 * - business / enterprise → employer-oriented quotas
 */
export const PLAN_LIMITS = {
  free: {
    maxApplicationsPerMonth: 20,
    maxSavedJobs: 20,
    maxJobAlerts: 3,
    maxAiGenerationsPerMonth: 2,
    maxActiveJobsEmployer: 1,
  },
  pro: {
    maxApplicationsPerMonth: 500,
    maxSavedJobs: 500,
    maxJobAlerts: 20,
    maxAiGenerationsPerMonth: 30,
    maxActiveJobsEmployer: 3,
  },
  business: {
    maxApplicationsPerMonth: 500,
    maxSavedJobs: 500,
    maxJobAlerts: 50,
    maxAiGenerationsPerMonth: 50,
    maxActiveJobsEmployer: 10,
  },
  enterprise: {
    maxApplicationsPerMonth: 5000,
    maxSavedJobs: 5000,
    maxJobAlerts: 200,
    maxAiGenerationsPerMonth: 200,
    maxActiveJobsEmployer: 50,
  },
} as const;

export type PlanLimits = (typeof PLAN_LIMITS)[PlanId];

/** Full limits object for a plan. */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

/** Employer active job posting quota. */
export function getEmployerActiveJobLimit(
  plan: string | null | undefined
): number {
  return getPlanLimits(plan).maxActiveJobsEmployer;
}

/** Single numeric limit helper. */
export function getPlanLimit(
  plan: string | null | undefined,
  type:
    | "maxApplicationsPerMonth"
    | "maxSavedJobs"
    | "maxJobAlerts"
    | "maxAiGenerationsPerMonth"
    | "maxActiveJobsEmployer" = "maxActiveJobsEmployer"
): number {
  return getPlanLimits(plan)[type];
}

/** True if expiresAt is in the past. Null/undefined = not expired. */
export function isPlanExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}
