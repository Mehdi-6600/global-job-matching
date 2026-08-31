export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EMPLOYER: "EMPLOYER",
  JOB_SEEKER: "JOB_SEEKER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

/** Employer panel + job management */
export function isEmployerRole(role: string | undefined | null): boolean {
  return (
    role === ROLES.EMPLOYER ||
    role === ROLES.ADMIN ||
    role === ROLES.OWNER
  );
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === ROLES.ADMIN || role === ROLES.OWNER;
}

export function isJobSeekerRole(role: string | undefined | null): boolean {
  return role === ROLES.JOB_SEEKER;
}

/** Normalize legacy lowercase values if any slip in */
export function normalizeRole(
  role: string | undefined | null
): Role | null {
  if (!role) return null;
  const key = role.trim().toUpperCase().replace(/[-\s]/g, "_");
  if (key === "JOBSEEKER" || key === "JOB_SEEKER") return ROLES.JOB_SEEKER;
  if (key === "EMPLOYER") return ROLES.EMPLOYER;
  if (key === "ADMIN") return ROLES.ADMIN;
  if (key === "OWNER") return ROLES.OWNER;
  return isValidRole(role) ? (role as Role) : null;
}
