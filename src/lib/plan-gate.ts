import { NextResponse } from "next/server";
import type { PlanId } from "@/lib/payment/plans";
import { getPlanLimits, isPaidPlan } from "@/lib/plan-limits";

export type QuotaKind =
  | "maxApplicationsPerMonth"
  | "maxSavedJobs"
  | "maxJobAlerts"
  | "maxAiGenerationsPerMonth"
  | "maxActiveJobsEmployer";

/** Standard JSON body when a plan quota is hit */
export function quotaExceededResponse(params: {
  code?: string;
  limit: number;
  used: number;
  plan: PlanId | string;
  kind: QuotaKind;
  message?: string;
}) {
  return NextResponse.json(
    {
      error:
        params.message ||
        `Plan limit reached (${params.kind}). Upgrade to continue.`,
      code: params.code || "QUOTA_EXCEEDED",
      kind: params.kind,
      limit: params.limit,
      used: params.used,
      plan: params.plan,
      upgradePath: "/pricing",
    },
    { status: 403 }
  );
}

/** Require a paid plan (pro/business/enterprise) */
export function requirePaidPlanResponse(plan: string) {
  if (isPaidPlan(plan)) return null;
  return NextResponse.json(
    {
      error: "This feature requires a paid plan.",
      code: "PAID_REQUIRED",
      plan,
      upgradePath: "/pricing",
    },
    { status: 403 }
  );
}

export function limitsFor(plan: string | null | undefined) {
  return getPlanLimits(plan);
}
