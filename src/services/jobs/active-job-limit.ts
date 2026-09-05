import type { Prisma, PrismaClient } from "@prisma/client";
import { getEmployerActiveJobLimit } from "@/lib/plan-limits";

type Tx = Prisma.TransactionClient | PrismaClient;

export function activeJobsWhereForUser(userId: string): Prisma.JobWhereInput {
  return {
    status: "active",
    OR: [{ postedById: userId }, { company: { ownerId: userId } }],
  };
}

/**
 * Lock the user row so concurrent job creates serialize on the same employer.
 * Must run inside an interactive transaction on PostgreSQL.
 */
export async function lockUserRow(tx: Tx, userId: string): Promise<void> {
  await tx.$queryRaw`
    SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE
  `;
}

export async function countActiveJobsForUser(
  tx: Tx,
  userId: string
): Promise<number> {
  return tx.job.count({
    where: activeJobsWhereForUser(userId),
  });
}

/**
 * Returns null if allowed, or an error payload if limit reached.
 * excludeJobId: when reactivating, don't count this job if it is already active.
 */
export async function assertCanCreateOrActivateJob(
  tx: Tx,
  params: {
    userId: string;
    plan: string | null | undefined;
    excludeJobId?: string;
  }
): Promise<
  | null
  | {
      status: 403;
      error: string;
      code: "PLAN_LIMIT_JOBS";
      limit: number;
      used: number;
    }
> {
  const limit = getEmployerActiveJobLimit(params.plan);
  const used = await countActiveJobsForUser(tx, params.userId);

  if (params.excludeJobId) {
    const self = await tx.job.findFirst({
      where: {
        id: params.excludeJobId,
        status: "active",
        OR: [
          { postedById: params.userId },
          { company: { ownerId: params.userId } },
        ],
      },
      select: { id: true },
    });
    if (self) {
      return null;
    }
  }

  if (used >= limit) {
    return {
      status: 403,
      error: `Active job limit reached (${limit}). Upgrade your plan to post more jobs.`,
      code: "PLAN_LIMIT_JOBS",
      limit,
      used,
    };
  }

  return null;
}
