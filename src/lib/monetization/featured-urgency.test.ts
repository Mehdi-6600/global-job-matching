import { describe, it, expect } from "vitest";
import { getUrgencyState, FEATURED_CONFIG } from "./featured-urgency";

describe("featured-urgency — honest only", () => {
  it("calculates slots left from real count", () => {
    expect(getUrgencyState(0).slotsLeft).toBe(5);
    expect(getUrgencyState(2).slotsTaken).toBe(2);
    expect(getUrgencyState(5).slotsLeft).toBe(0);
    expect(getUrgencyState(10).slotsLeft).toBe(0); // clamped
  });

  it("isAlmostFull only when 1-2 left", () => {
    expect(getUrgencyState(0).isAlmostFull).toBe(false);
    expect(getUrgencyState(3).isAlmostFull).toBe(true); // 2 left
    expect(getUrgencyState(4).isAlmostFull).toBe(true); // 1 left
    expect(getUrgencyState(5).isAlmostFull).toBe(false); // 0 left -> not almost, it's full
  });

  it("does not invent synthetic social proof", () => {
    const s = getUrgencyState(0);
    expect(s).not.toHaveProperty("socialProofText");
    expect(s).not.toHaveProperty("valueProp");
    expect(s).not.toHaveProperty("discountEndsAt");
  });

  it("campaignEndsAt only from env", () => {
    const prev = process.env.FEATURED_CAMPAIGN_ENDS_AT;
    delete process.env.FEATURED_CAMPAIGN_ENDS_AT;
    expect(getUrgencyState(0).campaignEndsAt).toBeNull();
    process.env.FEATURED_CAMPAIGN_ENDS_AT = "2026-12-31T00:00:00Z";
    expect(getUrgencyState(0).campaignEndsAt).toBe("2026-12-31T00:00:00Z");
    if (prev) process.env.FEATURED_CAMPAIGN_ENDS_AT = prev;
    else delete process.env.FEATURED_CAMPAIGN_ENDS_AT;
  });

  it("honest competitor price unchanged", () => {
    expect(FEATURED_CONFIG.competitorPrice).toBe(499);
    expect(FEATURED_CONFIG.maxSlots).toBe(5);
  });
});
