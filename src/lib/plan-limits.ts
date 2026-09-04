import { describe, it, expect } from "vitest";
import {
  normalizePlan,
  getPlanLimits,
  getEmployerActiveJobLimit,
  isPlanExpired,
  isPaidPlan,
} from "./plan-limits";

describe("plan-limits", () => {
  it("normalizes unknown to free", () => {
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan("FREE")).toBe("free");
    expect(normalizePlan("pro")).toBe("pro");
  });

  it("free employer can post at least 1 job", () => {
    expect(getEmployerActiveJobLimit("free")).toBeGreaterThanOrEqual(1);
  });

  it("pro has higher seeker quotas than free", () => {
    expect(getPlanLimits("pro").maxApplicationsPerMonth).toBeGreaterThan(
      getPlanLimits("free").maxApplicationsPerMonth
    );
  });

  it("detects paid plans", () => {
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
  });

  it("isPlanExpired", () => {
    expect(isPlanExpired(null)).toBe(false);
    expect(isPlanExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isPlanExpired(new Date(Date.now() + 86400000))).toBe(false);
  });
});
