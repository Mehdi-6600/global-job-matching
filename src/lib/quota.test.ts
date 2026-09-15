import { describe, expect, it } from "vitest";
import { isAiUsageKind, monthPeriodKey } from "@/lib/quota";

describe("quota helpers", () => {
  it("monthPeriodKey is YYYY-MM UTC", () => {
    const key = monthPeriodKey(new Date(Date.UTC(2026, 8, 15)));
    expect(key).toBe("2026-09");
  });

  it("recognizes AI usage kinds including roadmap/migration", () => {
    expect(isAiUsageKind("ai_resume")).toBe(true);
    expect(isAiUsageKind("ai_career_risk")).toBe(true);
    expect(isAiUsageKind("ai_roadmap")).toBe(true);
    expect(isAiUsageKind("ai_migration")).toBe(true);
    expect(isAiUsageKind("application")).toBe(false);
    expect(isAiUsageKind("unknown")).toBe(false);
  });
});
