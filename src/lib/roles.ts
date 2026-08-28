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

/** Employer panel + job management roles */
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
