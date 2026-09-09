import { describe, it, expect } from "vitest";
import {
  normalizePlan,
  getPlanLimits,
  getEmployerActiveJobLimit,
  getPlanLimit,
  isPlanExpired,
  isPaidPlan,
  PLAN_LIMITS,
} from "./plan-limits";

describe("plan-limits", () => {
  it("normalizes unknown to free", () => {
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan(null)).toBe("free");
    expect(normalizePlan("FREE")).toBe("free");
    expect(normalizePlan("pro")).toBe("pro");
    expect(normalizePlan("BUSINESS")).toBe("business");
    expect(normalizePlan("enterprise")).toBe("enterprise");
    expect(normalizePlan("gold")).toBe("free");
  });

  it("free employer can post at least 1 job", () => {
    expect(getEmployerActiveJobLimit("free")).toBeGreaterThanOrEqual(1);
  });

  it("employer quotas increase with higher plans", () => {
    expect(getEmployerActiveJobLimit("free")).toBeLessThan(
      getEmployerActiveJobLimit("pro")
    );
    expect(getEmployerActiveJobLimit("pro")).toBeLessThan(
      getEmployerActiveJobLimit("business")
    );
    expect(getEmployerActiveJobLimit("business")).toBeLessThan(
      getEmployerActiveJobLimit("enterprise")
    );
  });

  it("pro has higher seeker quotas than free", () => {
    expect(getPlanLimits("pro").maxApplicationsPerMonth).toBeGreaterThan(
      getPlanLimits("free").maxApplicationsPerMonth
    );
    expect(getPlanLimits("pro").maxSavedJobs).toBeGreaterThan(
      getPlanLimits("free").maxSavedJobs
    );
  });

  it("getPlanLimit returns selected numeric field", () => {
    expect(getPlanLimit("free", "maxActiveJobsEmployer")).toBe(
      PLAN_LIMITS.free.maxActiveJobsEmployer
    );
    expect(getPlanLimit("enterprise", "maxAiGenerationsPerMonth")).toBe(
      PLAN_LIMITS.enterprise.maxAiGenerationsPerMonth
    );
  });

  it("detects paid plans", () => {
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("business")).toBe(true);
    expect(isPaidPlan("enterprise")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan(null)).toBe(false);
  });

  it("isPlanExpired", () => {
    expect(isPlanExpired(null)).toBe(false);
    expect(isPlanExpired(undefined)).toBe(false);
    expect(isPlanExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isPlanExpired(new Date(Date.now() + 86400000))).toBe(false);
  });
});
