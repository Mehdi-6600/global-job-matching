export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EMPLOYER: "EMPLOYER",
  JOB_SEEKER: "JOB_SEEKER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All valid roles as a readonly array */
export const ROLE_LIST: readonly Role[] = Object.values(ROLES) as Role[];

export type RoleLocale = "en" | "es" | "ar" | "fa" | "hi" | "fr" | "de";

const ROLE_LOCALES: readonly RoleLocale[] = [
  "en",
  "es",
  "ar",
  "fa",
  "hi",
  "fr",
  "de",
];

const ROLE_LABELS: Record<RoleLocale, Record<Role, string>> = {
  en: {
    OWNER: "Owner",
    ADMIN: "Admin",
    EMPLOYER: "Employer",
    JOB_SEEKER: "Job Seeker",
  },
  es: {
    OWNER: "Propietario",
    ADMIN: "Administrador",
    EMPLOYER: "Empleador",
    JOB_SEEKER: "Candidato",
  },
  ar: {
    OWNER: "المالك",
    ADMIN: "المدير",
    EMPLOYER: "صاحب العمل",
    JOB_SEEKER: "طالب عمل",
  },
  fa: {
    OWNER: "مالک",
    ADMIN: "مدیر",
    EMPLOYER: "کارفرما",
    JOB_SEEKER: "کارجو",
  },
  hi: {
    OWNER: "स्वामी",
    ADMIN: "प्रशासक",
    EMPLOYER: "नियोक्ता",
    JOB_SEEKER: "नौकरी खोजने वाला",
  },
  fr: {
    OWNER: "Propriétaire",
    ADMIN: "Administrateur",
    EMPLOYER: "Employeur",
    JOB_SEEKER: "Candidat",
  },
  de: {
    OWNER: "Eigentümer",
    ADMIN: "Administrator",
    EMPLOYER: "Arbeitgeber",
    JOB_SEEKER: "Bewerber",
  },
};

const UNKNOWN_LABELS: Record<RoleLocale, string> = {
  en: "Unknown",
  es: "Desconocido",
  ar: "غير معروف",
  fa: "نامشخص",
  hi: "अज्ञात",
  fr: "Inconnu",
  de: "Unbekannt",
};

/** Normalize a locale string into a supported RoleLocale (defaults to "en") */
export function normalizeLocale(locale?: string | null): RoleLocale {
  const p = String(locale || "en")
    .toLowerCase()
    .slice(0, 2) as RoleLocale;
  return ROLE_LOCALES.includes(p) ? p : "en";
}

/** Type guard: true when value is a known Role */
export function isValidRole(role: unknown): role is Role {
  return (
    typeof role === "string" &&
    ROLE_LIST.includes(role.trim().toUpperCase() as Role)
  );
}

/**
 * Normalize incoming role strings (case, spaces, hyphens, legacy forms).
 * Returns null when the value is not a known role.
 */
export function normalizeRole(role: string | undefined | null): Role | null {
  if (!role || typeof role !== "string") return null;

  const key = role.trim().toUpperCase().replace(/[-\s]+/g, "_");

  switch (key) {
    case "OWNER":
      return ROLES.OWNER;
    case "ADMIN":
      return ROLES.ADMIN;
    case "EMPLOYER":
      return ROLES.EMPLOYER;
    case "JOBSEEKER":
    case "JOB_SEEKER":
      return ROLES.JOB_SEEKER;
    default:
      return isValidRole(role) ? (role.trim().toUpperCase() as Role) : null;
  }
}

/** Employer panel access: EMPLOYER, ADMIN, or OWNER */
export function isEmployerRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === ROLES.EMPLOYER || r === ROLES.ADMIN || r === ROLES.OWNER;
}

/** Admin panel access: ADMIN or OWNER */
export function isAdminRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.OWNER;
}

/** Owner-only checks */
export function isOwnerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === ROLES.OWNER;
}

/** Job seeker role */
export function isJobSeekerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === ROLES.JOB_SEEKER;
}

/** True when normalized role is one of the allowed roles */
export function hasAnyRole(
  role: string | undefined | null,
  allowedRoles: readonly Role[]
): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return allowedRoles.includes(normalized);
}

/** True when normalized role equals the target role */
export function hasRole(
  role: string | undefined | null,
  targetRole: Role
): boolean {
  return normalizeRole(role) === targetRole;
}

/**
 * Human-readable role label for UI.
 * Pass locale (en/es/ar/fa/hi/fr/de); defaults to English.
 */
export function getRoleLabel(
  role: string | undefined | null,
  locale?: string | null
): string {
  const loc = normalizeLocale(locale);
  const normalized = normalizeRole(role);
  if (!normalized) return UNKNOWN_LABELS[loc];
  return ROLE_LABELS[loc][normalized];
}

/** Middleware / guard helper for employer panel */
export function canAccessEmployerPanel(
  role: string | undefined | null
): boolean {
  return isEmployerRole(role);
}

/** Middleware / guard helper for admin panel */
export function canAccessAdminPanel(
  role: string | undefined | null
): boolean {
  return isAdminRole(role);
}

/** Middleware / guard helper for owner-only surfaces */
export function canAccessOwnerPanel(
  role: string | undefined | null
): boolean {
  return isOwnerRole(role);
}

/**
 * Returns the highest-privilege role from a list of roles.
 * Useful when a user has multiple roles.
 */
export function getHighestRole(
  roles: readonly (string | undefined | null)[]
): Role | null {
  const priority: Role[] = [
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.EMPLOYER,
    ROLES.JOB_SEEKER,
  ];
  for (const r of priority) {
    if (roles.some((role) => normalizeRole(role) === r)) return r;
  }
  return null;
}

/**
 * Sort comparator: highest-privilege roles first.
 */
export function compareRolesByPriority(
  a: string | undefined | null,
  b: string | undefined | null
): number {
  const order: Record<Role, number> = {
    [ROLES.OWNER]: 0,
    [ROLES.ADMIN]: 1,
    [ROLES.EMPLOYER]: 2,
    [ROLES.JOB_SEEKER]: 3,
  };
  const ra = normalizeRole(a);
  const rb = normalizeRole(b);
  const pa = ra ? order[ra] : Number.MAX_SAFE_INTEGER;
  const pb = rb ? order[rb] : Number.MAX_SAFE_INTEGER;
  return pa - pb;
}
