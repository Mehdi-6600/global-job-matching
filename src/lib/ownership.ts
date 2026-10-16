import type { Prisma, PrismaClient } from "@prisma/client";
import { isAdminRole, normalizeRole } from "@/lib/roles";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * True if the user can manage this job.
 *
 * Policy (derived from the ownership tests in this repo; the owner has not yet
 * confirmed it, see docs/BUYER_READINESS_REVIEW.md section H.1):
 * - Admin / OWNER: may manage any job.
 * - Everyone else: must own the job's company (`company.ownerId`).
 * - A job with no company (`company` null) is manageable by admins only.
 *   The original poster does NOT gain access through `postedById` alone:
 *   a poster who no longer owns the company, or whose job was detached from
 *   a company, loses management rights.
 *
 * `postedById` is intentionally not consulted here. It is still recorded for
 * attribution and for read-only listings, but it is not an authorization
 * grant.
 *
 * Fail closed: an unrecognised or missing role grants no access.
 */
export function canManageJob(
  userId: string,
  role: string | null | undefined,
  job: {
    postedById?: string | null;
    company?: { ownerId?: string | null } | null;
  }
): boolean {
  if (!normalizeRole(role)) return false;
  if (isAdminRole(role)) return true;
  if (!userId) return false;
  if (!job.company) return false;
  return Boolean(job.company.ownerId) && job.company.ownerId === userId;
}

/**
 * True if the user owns / can manage this company.
 */
export function canManageCompany(
  userId: string,
  role: string | null | undefined,
  company: { ownerId?: string | null }
): boolean {
  // Fail closed for unknown or missing roles, as canManageJob does.
  if (!normalizeRole(role)) return false;
  if (isAdminRole(role)) return true;
  return !!company.ownerId && company.ownerId === userId;
}

/**
 * Load a job and verify the caller can manage it.
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
 * Load an application the employer/admin can manage.
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
 * Applicant can only read/update their own application row (limited fields).
 */
export async function getOwnApplication(
  tx: Tx,
  applicationId: string,
  userId: string
) {
  return tx.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: { select: { name: true } },
        },
      },
    },
  });
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
