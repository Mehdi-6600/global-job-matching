import { describe, expect, it } from "vitest";
import {
  canManageCompany,
  canManageJob,
} from "@/lib/ownership";
import {
  isAdminRole,
  isEmployerRole,
  normalizeRole,
  ROLES,
} from "@/lib/roles";

// ---------------------------------------------------------------------------
// canManageJob — ownership / IDOR primitives
// ---------------------------------------------------------------------------

describe("canManageJob (ownership / IDOR primitives)", () => {
  const jobA = {
    postedById: "employer-a",
    company: { ownerId: "employer-a" },
  };
  const jobB = {
    postedById: "employer-b",
    company: { ownerId: "employer-b" },
  };

  it("Employer A cannot manage Employer B job", () => {
    expect(canManageJob("employer-a", ROLES.EMPLOYER, jobB)).toBe(false);
  });

  it("Employer A can manage own job as poster", () => {
    expect(canManageJob("employer-a", ROLES.EMPLOYER, jobA)).toBe(true);
  });

  it("Employer A can manage job owned via company.ownerId", () => {
    const job = {
      postedById: "other-poster",
      company: { ownerId: "employer-a" },
    };
    expect(canManageJob("employer-a", ROLES.EMPLOYER, job)).toBe(true);
  });

  it("Employer B can manage own resources only", () => {
    expect(canManageJob("employer-b", ROLES.EMPLOYER, jobB)).toBe(true);
    expect(canManageJob("employer-b", ROLES.EMPLOYER, jobA)).toBe(false);
  });

  it("Admin and Owner can manage any job", () => {
    expect(canManageJob("admin-1", ROLES.ADMIN, jobB)).toBe(true);
    expect(canManageJob("owner-1", ROLES.OWNER, jobA)).toBe(true);
    // Legacy role string must still resolve to admin.
    expect(canManageJob("admin-1", "admin", jobB)).toBe(true);
  });

  it("Job seeker cannot manage employer jobs", () => {
    expect(canManageJob("seeker-1", ROLES.JOB_SEEKER, jobA)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Boundary / edge cases
  // -------------------------------------------------------------------------

  it("Employer cannot manage a job without a company", () => {
    const orphanJob = { postedById: "employer-a", company: null };
    expect(canManageJob("employer-a", ROLES.EMPLOYER, orphanJob)).toBe(false);
  });

  it("Employer cannot manage a job with empty postedById and missing owner", () => {
    const anonymousJob = {
      postedById: null,
      company: { ownerId: null },
    };
    expect(
      canManageJob("employer-a", ROLES.EMPLOYER, anonymousJob)
    ).toBe(false);
  });

  it("Unknown role is treated as non-privileged", () => {
    expect(canManageJob("employer-a", "unknown-role", jobA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canManageCompany
// ---------------------------------------------------------------------------

describe("canManageCompany", () => {
  it("blocks cross-owner company access", () => {
    expect(
      canManageCompany("employer-a", ROLES.EMPLOYER, {
        ownerId: "employer-b",
      })
    ).toBe(false);
  });

  it("allows owner and admin", () => {
    expect(
      canManageCompany("employer-a", ROLES.EMPLOYER, {
        ownerId: "employer-a",
      })
    ).toBe(true);
    expect(
      canManageCompany("admin-1", ROLES.ADMIN, { ownerId: "employer-b" })
    ).toBe(true);
  });

  it("blocks employer when ownerId is null", () => {
    expect(
      canManageCompany("employer-a", ROLES.EMPLOYER, { ownerId: null })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// role primitives
// ---------------------------------------------------------------------------

describe("role primitives", () => {
  it("normalizes legacy forms without escalation", () => {
    expect(normalizeRole("AdMiN")).toBe(ROLES.ADMIN);
    expect(normalizeRole("job-seeker")).toBe(ROLES.JOB_SEEKER);
    expect(normalizeRole("super-admin")).toBeNull();
  });

  it("admin/employer guards", () => {
    expect(isAdminRole("employer")).toBe(false);
    expect(isEmployerRole("jobseeker")).toBe(false);
    expect(isEmployerRole("employer")).toBe(true);
  });

  it("normalizeRole is case- and separator-insensitive for known roles", () => {
    expect(normalizeRole("EMPLOYER")).toBe(ROLES.EMPLOYER);
    expect(normalizeRole("job_seeker")).toBe(ROLES.JOB_SEEKER);
    expect(normalizeRole("JOB-SEEKER")).toBe(ROLES.JOB_SEEKER);
  });

  it("normalizeRole rejects unknown and privileged-looking inputs", () => {
    expect(normalizeRole("root")).toBeNull();
    expect(normalizeRole("superadmin")).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });

  it("isAdminRole accepts legacy admin variants", () => {
    expect(isAdminRole(ROLES.ADMIN)).toBe(true);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole(ROLES.OWNER)).toBe(false);
  });
});
