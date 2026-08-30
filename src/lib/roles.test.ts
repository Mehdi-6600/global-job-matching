import { describe, it, expect } from "vitest";
import {
  ROLES,
  isValidRole,
  isEmployerRole,
  isAdminRole,
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
});
