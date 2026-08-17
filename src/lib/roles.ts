export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EMPLOYER: "EMPLOYER",
  JOB_SEEKER: "JOB_SEEKER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isOwner(role: string | null | undefined): boolean {
  return role === ROLES.OWNER;
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

export function isEmployer(role: string | null | undefined): boolean {
  return role === ROLES.EMPLOYER || isAdmin(role);
}

export function isJobSeeker(role: string | null | undefined): boolean {
  return role === ROLES.JOB_SEEKER || isAdmin(role);
}

export function hasPaidAccess(role: string | null | undefined, membershipActive: boolean | Date | null): boolean {
  if (isAdmin(role)) return true;
  if (!membershipActive) return false;
  if (membershipActive instanceof Date) {
    return membershipActive > new Date();
  }
  return !!membershipActive;
}
