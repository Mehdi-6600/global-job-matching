import type { Prisma, PrismaClient } from "@prisma/client";
import { isAdminRole } from "@/lib/roles";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * True if the user can manage this job (poster, company owner, or admin).
 */
export function canManageJob(
  userId: string,
  role: string | null | undefined,
  job: {
    postedById?: string | null;
    company?: { ownerId?: string | null } | null;
  }
): boolean {
  if (isAdminRole(role)) return true;
  if (job.postedById && job.postedById === userId) return true;
  if (job.company?.ownerId && job.company.ownerId === userId) return true;
  return false;
}

/**
 * True if the user owns / can manage this company.
 */
export function canManageCompany(
  userId: string,
  role: string | null | undefined,
  company: { ownerId?: string | null }
): boolean {
  if (isAdminRole(role)) return true;
  return !!company.ownerId && company.ownerId === userId;
}

/**
 * Load a job and verify the caller can manage it.
 * Returns the job or null if not found / not allowed.
 */
export async function getManagedJob(
  tx: Tx,
  jobId: string,
  userId: string,
  role: string | null | undefined
) {
  const job = await tx.job.findUnique({
    where: { id: jobId },
    include: {
      company: { select: { id: true, ownerId: true, name: true } },
    },
  });

  if (!job) return null;
  if (!canManageJob(userId, role, job)) return null;
  return job;
}

/**
 * Load an application with job ownership fields.
 */
export async function getManagedApplication(
  tx: Tx,
  applicationId: string,
  userId: string,
  role: string | null | undefined
) {
  const application = await tx.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          postedById: true,
          company: {
            select: {
              ownerId: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!application) return null;
  if (!canManageJob(userId, role, application.job)) return null;
  return application;
}

/**
 * Whether two users may message each other:
 * - prior conversation exists, OR
 * - they share a job application relationship, OR
 * - caller is admin
 */
export async function canMessageUser(
  tx: Tx,
  senderId: string,
  receiverId: string,
  senderRole: string | null | undefined
): Promise<boolean> {
  if (isAdminRole(senderRole)) return true;
  if (senderId === receiverId) return false;

  const prior = await tx.message.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    select: { id: true },
  });
  if (prior) return true;

  // Employer of a job the other applied to
  const asEmployer = await tx.application.findFirst({
    where: {
      userId: receiverId,
      job: {
        OR: [
          { postedById: senderId },
          { company: { ownerId: senderId } },
        ],
      },
    },
    select: { id: true },
  });
  if (asEmployer) return true;

  // Applicant messaging employer of a job they applied to
  const asApplicant = await tx.application.findFirst({
    where: {
      userId: senderId,
      job: {
        OR: [
          { postedById: receiverId },
          { company: { ownerId: receiverId } },
        ],
      },
    },
    select: { id: true },
  });
  if (asApplicant) return true;

  return false;
}
