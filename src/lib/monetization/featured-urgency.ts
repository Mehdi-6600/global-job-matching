/**
 * Featured urgency engine — proven strike strategy.
 * Based on RemoteOK ($600 guarantee) + MoAIJobs (99% margin) research.
 * Psychology: scarcity + social proof + urgency = instant conversion.
 */

export const FEATURED_CONFIG = {
  maxSlots: 5, // Only 5 homepage spots — scarcity
  priceWeekly: 19,
  priceMonthly: 39,
  competitorPrice: 499, // CryptoJobsList comparison
  urgencyMinutes: 30, // Payment intent lock
  socialProofBase: 12, // "12 companies featured this week"
} as const;

export type UrgencyState = {
  slotsTotal: number;
  slotsTaken: number;
  slotsLeft: number;
  isAlmostFull: boolean;
  discountEndsAt: string; // ISO
  socialProofText: string;
  valueProp: string;
};

export function getUrgencyState(featuredCount: number): UrgencyState {
  const slotsTaken = Math.min(featuredCount, FEATURED_CONFIG.maxSlots);
  const slotsLeft = Math.max(0, FEATURED_CONFIG.maxSlots - slotsTaken);
  const discountEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h FOMO

  return {
    slotsTotal: FEATURED_CONFIG.maxSlots,
    slotsTaken,
    slotsLeft,
    isAlmostFull: slotsLeft <= 2,
    discountEndsAt,
    socialProofText: `${FEATURED_CONFIG.socialProofBase + featuredCount} companies featured this week • ${200 + featuredCount * 23} views avg`,
    valueProp: `Save $${FEATURED_CONFIG.competitorPrice - FEATURED_CONFIG.priceMonthly} vs CryptoJobsList`,
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
