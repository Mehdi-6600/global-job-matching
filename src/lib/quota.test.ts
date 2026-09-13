import { describe, it, expect } from "vitest";
import { monthPeriodKey } from "./quota";

describe("monthPeriodKey", () => {
  it("formats YYYY-MM in UTC", () => {
    const d = new Date(Date.UTC(2026, 8, 10));
    expect(monthPeriodKey(d)).toBe("2026-09");
  });

  it("pads single-digit months", () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    expect(monthPeriodKey(d)).toBe("2026-01");
  });

  it("uses UTC not local timezone for boundary days", () => {
    const d = new Date(Date.UTC(2026, 11, 31, 23, 0, 0));
    expect(monthPeriodKey(d)).toBe("2026-12");
  });
});
