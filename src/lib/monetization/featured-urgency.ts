/**
 * Featured urgency — honest scarcity only.
 * All numbers come from real DB counts. No synthetic social proof.
 * Only show promo if a real campaign with fixed end date exists.
 */

export const FEATURED_CONFIG = {
  maxSlots: 5,
  priceWeekly: 19,
  priceMonthly: 39,
  competitorPrice: 499,
} as const;

export type UrgencyState = {
  slotsTotal: number;
  slotsTaken: number;
  slotsLeft: number;
  isAlmostFull: boolean;
  // Only set when a real campaign exists with fixed end date via env or DB
  campaignEndsAt?: string | null;
};

export function getUrgencyState(featuredCount: number): UrgencyState {
  const slotsTaken = Math.min(featuredCount, FEATURED_CONFIG.maxSlots);
  const slotsLeft = Math.max(0, FEATURED_CONFIG.maxSlots - slotsTaken);
  return {
    slotsTotal: FEATURED_CONFIG.maxSlots,
    slotsTaken,
    slotsLeft,
    isAlmostFull: slotsLeft <= 2 && slotsLeft > 0,
    campaignEndsAt: process.env.FEATURED_CAMPAIGN_ENDS_AT || null,
  };
}

export function getCheckoutLinks(appUrl: string) {
  const base = appUrl.replace(/\/$/, "");
  return {
    pricing: `${base}/pricing`,
    postJob: `${base}/employer/post-job`,
    feature: (jobId: string) => `${base}/api/jobs/${jobId}/feature/intent`,
  };
}
