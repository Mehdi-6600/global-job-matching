import { describe, it, expect } from "vitest";
import { monthPeriodKey } from "./quota";

describe("monthPeriodKey", () => {
  it("formats YYYY-MM in UTC", () => {
    const d = new Date(Date.UTC(2026, 8, 10)); // September = month index 8
    expect(monthPeriodKey(d)).toBe("2026-09");
  });

  it("pads single-digit months", () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    expect(monthPeriodKey(d)).toBe("2026-01");
  });
});
