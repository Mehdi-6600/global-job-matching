import { describe, expect, it } from "vitest";
import { isAdminRole, isEmployerRole, normalizeRole, ROLES } from "@/lib/roles";

/**
 * Behavioral guards that IDOR-sensitive routes rely on.
 * Full DB ownership tests need integration fixtures; these lock the
 * authorization primitives those routes call.
 */
describe("IDOR-related role primitives", () => {
  it("admin bypass only for admin/owner normalized roles", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("OWNER")).toBe(true);
    expect(isAdminRole("employer")).toBe(false);
    expect(isAdminRole("job_seeker")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("employer panel is not open to job seekers", () => {
    expect(isEmployerRole("employer")).toBe(true);
    expect(isEmployerRole("admin")).toBe(true);
    expect(isEmployerRole("jobseeker")).toBe(false);
  });

  it("legacy role strings cannot escalate by casing tricks", () => {
    expect(normalizeRole("AdMiN")).toBe(ROLES.ADMIN);
    expect(normalizeRole("job-seeker")).toBe(ROLES.JOB_SEEKER);
    expect(normalizeRole("super-admin")).toBeNull();
  });
});
