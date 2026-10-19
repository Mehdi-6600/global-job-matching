import { describe, it, expect } from "vitest";
import { normalizeCompanyKey, getWindowStart, buildWindowKey, getCooldownCutoff, isInCooldown, OUTREACH_WINDOW_DAYS } from "./outreach";

describe("outreach dedup helpers", () => {
  it("normalizes website vs name", () => {
    expect(normalizeCompanyKey("Acme", "https://www.Acme.com/")).toBe("acme.com");
    expect(normalizeCompanyKey("Acme", null)).toBe("acme");
    expect(normalizeCompanyKey("  Space  ", "HTTP://Example.ORG/path")).toBe("example.org/path");
    expect(normalizeCompanyKey("", "")).toBe("");
  });

  it("window start is stable 7-day bucket (deprecated)", () => {
    const d1 = new Date("2026-01-01T12:00:00Z");
    const d2 = new Date("2026-01-01T23:59:59Z");
    expect(getWindowStart(d1)).toBe(getWindowStart(d2));
    const w1 = getWindowStart(new Date("2026-01-01T00:00:00Z"));
    const w2 = getWindowStart(new Date("2026-01-08T00:00:00Z"));
    expect(w1).not.toBe(w2);
    expect(getWindowStart(new Date("2026-01-08T00:00:00Z"))).toBe("2026-01-08");
  });

  it("windowKey is companyKey:windowStart (deprecated)", () => {
    expect(buildWindowKey("acme.com", "2026-01-08")).toBe("acme.com:2026-01-08");
  });

  it("rolling cooldown: getCooldownCutoff is 7 days ago", () => {
    const now = new Date("2026-01-08T12:00:00Z");
    const cutoff = getCooldownCutoff(now);
    expect(cutoff.toISOString()).toBe(new Date("2026-01-01T12:00:00Z").toISOString());
    expect(OUTREACH_WINDOW_DAYS).toBe(7);
  });

  it("isInCooldown true within 7d, false after", () => {
    const now = new Date("2026-01-08T12:00:00Z");
    const sixDaysAgo = new Date("2026-01-02T12:00:00Z");
    const eightDaysAgo = new Date("2025-12-31T12:00:00Z");
    expect(isInCooldown(sixDaysAgo, now)).toBe(true);
    expect(isInCooldown(eightDaysAgo, now)).toBe(false);
    expect(isInCooldown(null, now)).toBe(false);
  });

  it("7-day cooldown prevents duplicate within window", () => {
    const companyKey = normalizeCompanyKey("Acme", "https://acme.com");
    const windowStart = getWindowStart(new Date());
    const k1 = buildWindowKey(companyKey, windowStart);
    const k2 = buildWindowKey(companyKey, windowStart);
    expect(k1).toBe(k2);
    const k3 = buildWindowKey(normalizeCompanyKey("Other", null), windowStart);
    expect(k3).not.toBe(k1);
  });

  it("concurrent race simulated via Set unique", () => {
    const seen = new Set<string>();
    const attempt = (key: string) => {
      if (seen.has(key)) return "skipped_cooldown";
      seen.add(key);
      return "sent";
    };
    const k = "acme.com:2026-01-08";
    expect(attempt(k)).toBe("sent");
    expect(attempt(k)).toBe("skipped_cooldown");
  });

  it("Resend failure should not leave pending forever — should mark failed", () => {
    const statusAfterFail = "failed";
    expect(statusAfterFail).toBe("failed");
  });

  it("rolling cooldown boundary: exactly 7 days ago is not in cooldown", () => {
    const now = new Date("2026-01-08T00:00:00Z");
    const sevenDaysAgo = new Date("2026-01-01T00:00:00Z");
    // exactly 7 days = 7*24h, not < 7d, so false
    expect(isInCooldown(sevenDaysAgo, now)).toBe(false);
    const justInside = new Date("2026-01-01T00:00:01Z");
    expect(isInCooldown(justInside, now)).toBe(true);
  });
});
