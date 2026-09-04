import { describe, it, expect } from "vitest";
import { resolveEffectivePlan, computePlanExpiry } from "./subscription";

describe("resolveEffectivePlan", () => {
  it("keeps free as free", () => {
    expect(
      resolveEffectivePlan({ plan: "free", planExpiresAt: null }).plan
    ).toBe("free");
  });

  it("treats expired pro as free", () => {
    const past = new Date(Date.now() - 86400000);
    const r = resolveEffectivePlan({ plan: "pro", planExpiresAt: past });
    expect(r.plan).toBe("free");
    expect(r.expired).toBe(true);
  });

  it("keeps active pro", () => {
    const future = new Date(Date.now() + 86400000 * 10);
    const r = resolveEffectivePlan({ plan: "pro", planExpiresAt: future });
    expect(r.plan).toBe("pro");
    expect(r.expired).toBe(false);
  });
});

describe("computePlanExpiry", () => {
  it("adds roughly one month", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    const exp = computePlanExpiry(from, "monthly");
    expect(exp.getTime()).toBeGreaterThan(from.getTime());
  });
});
