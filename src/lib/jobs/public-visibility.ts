import { isAdminRole } from "@/lib/roles";

/** Status values that any anonymous / non-owner caller may see */
export const PUBLIC_JOB_STATUSES = ["active"] as const;

export type PublicJobStatus = (typeof PUBLIC_JOB_STATUSES)[number];

export function isPublicJobStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PUBLIC_JOB_STATUSES as readonly string[]).includes(status);
}

/**
 * Whether the caller may view this job detail.
 * - Public / unrelated users: only public statuses
 * - Poster, company owner, or admin: any status
 */
export function canViewJobDetail(params: {
  jobStatus: string;
  postedById?: string | null;
  companyOwnerId?: string | null;
  viewerId?: string | null;
  viewerRole?: string | null;
}): boolean {
  if (isAdminRole(params.viewerRole)) return true;

  if (params.viewerId) {
    if (params.postedById && params.postedById === params.viewerId) return true;
    if (params.companyOwnerId && params.companyOwnerId === params.viewerId) {
      return true;
    }
  }

  return isPublicJobStatus(params.jobStatus);
}
