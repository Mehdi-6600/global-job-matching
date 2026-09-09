import { describe, it, expect } from "vitest";
import {
  resolveEffectivePlan,
  computePlanExpiry,
  daysUntilExpiry,
} from "./subscription";

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

  it("normalizes unknown plan to free", () => {
    const r = resolveEffectivePlan({ plan: "GOLD", planExpiresAt: null });
    expect(r.plan).toBe("free");
    expect(r.expired).toBe(false);
  });

  it("does not mark free as expired even with past date", () => {
    const past = new Date(Date.now() - 86400000);
    const r = resolveEffectivePlan({ plan: "free", planExpiresAt: past });
    expect(r.plan).toBe("free");
    expect(r.expired).toBe(false);
  });
});

describe("computePlanExpiry", () => {
  it("adds roughly one month for monthly billing", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    const exp = computePlanExpiry(from, "monthly");
    expect(exp.getTime()).toBeGreaterThan(from.getTime());
    expect(exp.getUTCMonth()).toBe(1);
  });

  it("adds one year for yearly billing", () => {
    const from = new Date("2026-01-15T12:00:00.000Z");
    const exp = computePlanExpiry(from, "yearly");
    expect(exp.getUTCFullYear()).toBe(2027);
  });
});

describe("daysUntilExpiry", () => {
  it("returns null when no expiry", () => {
    expect(daysUntilExpiry(null)).toBeNull();
    expect(daysUntilExpiry(undefined)).toBeNull();
  });

  it("returns 0 for past dates", () => {
    expect(daysUntilExpiry(new Date(Date.now() - 60_000))).toBe(0);
  });

  it("returns positive days for future dates", () => {
    const days = daysUntilExpiry(new Date(Date.now() + 3 * 86400000));
    expect(days).toBeGreaterThanOrEqual(3);
    expect(days).toBeLessThanOrEqual(4);
  });
});
