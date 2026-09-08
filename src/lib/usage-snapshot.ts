import { db } from "@/lib/db";
import { getPlanLimits, type PlanId } from "@/lib/plan-limits";
import { monthPeriodKey } from "@/lib/quota";

export type UsageSnapshot = {
  periodKey: string;
  applications: { used: number; limit: number };
  savedJobs: { used: number; limit: number };
  jobAlerts: { used: number; limit: number };
  aiGenerations: { used: number; limit: number };
  activeEmployerJobs: { used: number; limit: number };
  pendingPayments: number;
};

function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Read-only quota snapshot for a user under an effective plan.
 */
export async function getUsageSnapshot(
  userId: string,
  plan: PlanId | string
): Promise<UsageSnapshot> {
  const limits = getPlanLimits(plan);
  const start = monthStartUtc();
  const periodKey = monthPeriodKey();

  const [
    applications,
    savedJobs,
    jobAlerts,
    aiGenerations,
    activeEmployerJobs,
    pendingPayments,
  ] = await Promise.all([
    db.application.count({
      where: { userId, createdAt: { gte: start } },
    }),
    db.savedJob.count({ where: { userId } }),
    db.jobAlert.count({ where: { userId } }),
    db.usageEvent.count({
      where: {
        userId,
        periodKey,
        kind: { in: ["ai_resume", "ai_career_risk"] },
      },
    }),
    db.job.count({
      where: {
        status: "active",
        OR: [{ postedById: userId }, { company: { ownerId: userId } }],
      },
    }),
    db.transaction.count({
      where: { userId, status: "pending" },
    }),
  ]);

  return {
    periodKey,
    applications: {
      used: applications,
      limit: limits.maxApplicationsPerMonth,
    },
    savedJobs: {
      used: savedJobs,
      limit: limits.maxSavedJobs,
    },
    jobAlerts: {
      used: jobAlerts,
      limit: limits.maxJobAlerts,
    },
    aiGenerations: {
      used: aiGenerations,
      limit: limits.maxAiGenerationsPerMonth,
    },
    activeEmployerJobs: {
      used: activeEmployerJobs,
      limit: limits.maxActiveJobsEmployer,
    },
    pendingPayments,
  };
}
