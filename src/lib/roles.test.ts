import { describe, expect, it } from "vitest";
import {
  ROLES,
  normalizeRole,
  isAdminRole,
  isOwnerRole,
  isEmployerRole,
  isJobSeekerRole,
  getRoleLabel,
  hasAnyRole,
  hasRole,
  canAccessAdminPanel,
  canAccessEmployerPanel,
} from "@/lib/roles";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = ["en", "es", "ar", "fa", "hi", "fr", "de"] as const;

const ALL_ROLES = Object.values(ROLES);

// ---------------------------------------------------------------------------
// normalizeRole
// ---------------------------------------------------------------------------

describe("normalizeRole", () => {
  it.each([
    ["admin", ROLES.ADMIN],
    ["ADMIN", ROLES.ADMIN],
    ["JOBSEEKER", ROLES.JOB_SEEKER],
    ["job-seeker", ROLES.JOB_SEEKER],
    ["job_seeker", ROLES.JOB_SEEKER],
    ["  Employer ", ROLES.EMPLOYER],
    ["employer", ROLES.EMPLOYER],
    ["owner", ROLES.OWNER],
    ["OWNER", ROLES.OWNER],
  ])("maps %j to %j", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });

  it.each([["superuser"], ["guest"], [""], ["   "]])(
    "returns null for unknown value %j",
    (input) => {
      expect(normalizeRole(input)).toBeNull();
    },
  );

  it("returns null for null and undefined", () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Role helpers (must use normalization)
// ---------------------------------------------------------------------------

describe("isAdminRole", () => {
  it.each([["admin"], ["ADMIN"], ["admin "], ["owner"], ["OWNER"]])(
    "treats %j as admin",
    (value) => {
      expect(isAdminRole(value)).toBe(true);
    },
  );

  it.each([["employer"], ["job_seeker"], ["jobseeker"], ["guest"], [null]])(
    "does not treat %j as admin",
    (value) => {
      expect(isAdminRole(value)).toBe(false);
    },
  );
});

describe("isEmployerRole", () => {
  it("includes employer, admin and owner", () => {
    expect(isEmployerRole("employer")).toBe(true);
    expect(isEmployerRole("EMPLOYER")).toBe(true);
    expect(isEmployerRole("ADMIN")).toBe(true);
    expect(isEmployerRole("owner")).toBe(true);
  });

  it("excludes job seekers and unknown", () => {
    expect(isEmployerRole("job_seeker")).toBe(false);
    expect(isEmployerRole("jobseeker")).toBe(false);
    expect(isEmployerRole(null)).toBe(false);
  });
});

describe("isOwnerRole", () => {
  it("is strict", () => {
    expect(isOwnerRole("owner")).toBe(true);
    expect(isOwnerRole("OWNER")).toBe(true);
    expect(isOwnerRole("admin")).toBe(false);
    expect(isOwnerRole("employer")).toBe(false);
  });
});

describe("isJobSeekerRole", () => {
  it("accepts job seeker variants", () => {
    expect(isJobSeekerRole("jobseeker")).toBe(true);
    expect(isJobSeekerRole("job_seeker")).toBe(true);
    expect(isJobSeekerRole("JOBSEEKER")).toBe(true);
  });

  it("rejects other roles", () => {
    expect(isJobSeekerRole("admin")).toBe(false);
    expect(isJobSeekerRole("employer")).toBe(false);
    expect(isJobSeekerRole("owner")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRoleLabel
// ---------------------------------------------------------------------------

describe("getRoleLabel multilingual", () => {
  it("returns a non-empty label for every locale and role", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const role of ALL_ROLES) {
        const label = getRoleLabel(role, locale);
        expect(label.length).toBeGreaterThan(1);
        expect(label).not.toBe("Unknown");
      }
    }
  });

  it("localizes the unknown fallback", () => {
    expect(getRoleLabel("nope", "fa")).toBe("نامشخص");
    expect(getRoleLabel("nope", "de")).toBe("Unbekannt");
    expect(getRoleLabel("nope", "en")).not.toBe("نامشخص");
  });

  it("falls back to a non-empty label for unsupported locales", () => {
    const label = getRoleLabel(ROLES.ADMIN, "xx" as never);
    expect(label.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

describe("hasAnyRole", () => {
  it("returns true when at least one role matches", () => {
    expect(hasAnyRole("admin", [ROLES.ADMIN, ROLES.OWNER])).toBe(true);
    expect(hasAnyRole("owner", [ROLES.ADMIN, ROLES.OWNER])).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasAnyRole("employer", [ROLES.ADMIN])).toBe(false);
    expect(hasAnyRole("jobseeker", [ROLES.OWNER, ROLES.ADMIN])).toBe(false);
  });

  it("returns false for empty role lists", () => {
    expect(hasAnyRole("admin", [])).toBe(false);
  });
});

describe("hasRole", () => {
  it("matches a single role with normalization", () => {
    expect(hasRole("owner", ROLES.OWNER)).toBe(true);
    expect(hasRole("OWNER", ROLES.OWNER)).toBe(true);
  });

  it("does not match a different role", () => {
    expect(hasRole("admin", ROLES.OWNER)).toBe(false);
    expect(hasRole("employer", ROLES.ADMIN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Panel guards
// ---------------------------------------------------------------------------

describe("panel guards", () => {
  it("admin panel is admin/owner only", () => {
    expect(canAccessAdminPanel("admin")).toBe(true);
    expect(canAccessAdminPanel("owner")).toBe(true);
    expect(canAccessAdminPanel("job_seeker")).toBe(false);
    expect(canAccessAdminPanel("employer")).toBe(false);
  });

  it("employer panel is employer/admin/owner", () => {
    expect(canAccessEmployerPanel("employer")).toBe(true);
    expect(canAccessEmployerPanel("admin")).toBe(true);
    expect(canAccessEmployerPanel("owner")).toBe(true);
  });

  it("employer panel rejects job seekers", () => {
    expect(canAccessEmployerPanel("job_seeker")).toBe(false);
    expect(canAccessEmployerPanel("jobseeker")).toBe(false);
  });
});
