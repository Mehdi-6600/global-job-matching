import { describe, it, expect } from "vitest";
import {
  ROLES,
  isValidRole,
  isEmployerRole,
  isAdminRole,
  isOwnerRole,
  isJobSeekerRole,
  normalizeRole,
} from "./roles";

describe("roles helpers", () => {
  it("exposes expected role constants", () => {
    expect(ROLES.JOB_SEEKER).toBe("JOB_SEEKER");
    expect(ROLES.EMPLOYER).toBe("EMPLOYER");
    expect(ROLES.ADMIN).toBe("ADMIN");
    expect(ROLES.OWNER).toBe("OWNER");
  });

  it("isValidRole accepts only known roles", () => {
    expect(isValidRole("EMPLOYER")).toBe(true);
    expect(isValidRole("JOB_SEEKER")).toBe(true);
    expect(isValidRole("employer")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });

  it("isEmployerRole includes employer, admin, owner", () => {
    expect(isEmployerRole(ROLES.EMPLOYER)).toBe(true);
    expect(isEmployerRole(ROLES.ADMIN)).toBe(true);
    expect(isEmployerRole(ROLES.OWNER)).toBe(true);
    expect(isEmployerRole(ROLES.JOB_SEEKER)).toBe(false);
    expect(isEmployerRole(null)).toBe(false);
    expect(isEmployerRole(undefined)).toBe(false);
  });

  it("isAdminRole is only admin and owner", () => {
    expect(isAdminRole(ROLES.ADMIN)).toBe(true);
    expect(isAdminRole(ROLES.OWNER)).toBe(true);
    expect(isAdminRole(ROLES.EMPLOYER)).toBe(false);
    expect(isAdminRole(ROLES.JOB_SEEKER)).toBe(false);
  });

  it("isOwnerRole and isJobSeekerRole", () => {
    expect(isOwnerRole(ROLES.OWNER)).toBe(true);
    expect(isOwnerRole(ROLES.ADMIN)).toBe(false);
    expect(isJobSeekerRole(ROLES.JOB_SEEKER)).toBe(true);
    expect(isJobSeekerRole(ROLES.EMPLOYER)).toBe(false);
  });

  it("normalizeRole maps legacy forms", () => {
    expect(normalizeRole("employer")).toBe("EMPLOYER");
    expect(normalizeRole("job-seeker")).toBe("JOB_SEEKER");
    expect(normalizeRole("JOBSEEKER")).toBe("JOB_SEEKER");
    expect(normalizeRole("admin")).toBe("ADMIN");
    expect(normalizeRole("owner")).toBe("OWNER");
    expect(normalizeRole("nope")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });
});
