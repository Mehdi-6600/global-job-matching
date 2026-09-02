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

/** Soft limits — enforce in APIs next */
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
    maxActiveJobsEmployer: 0,
  },
  business: {
    maxApplicationsPerMonth: 500,
    maxSavedJobs: 500,
    maxJobAlerts: 50,
    maxAiGenerationsPerMonth: 50,
    maxActiveJobsEmployer: 5,
  },
  enterprise: {
    maxApplicationsPerMonth: 5000,
    maxSavedJobs: 5000,
    maxJobAlerts: 200,
    maxAiGenerationsPerMonth: 200,
    maxActiveJobsEmployer: 50,
  },
} as const;

export function getPlanLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[normalizePlan(plan)];
}
