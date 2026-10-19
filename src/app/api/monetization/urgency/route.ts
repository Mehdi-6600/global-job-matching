import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FEATURED_CONFIG, getUrgencyState } from "@/lib/monetization/featured-urgency";

/**
 * Public urgency endpoint — honest data only.
 * Featured count + total jobs are real DB counts.
 * No synthetic social proof. Campaign timer only if FEATURED_CAMPAIGN_ENDS_AT is set.
 */
export async function GET() {
  try {
    const featuredCount = await db.job.count({
      where: { featured: true, featuredUntil: { gte: new Date() }, status: "active" },
    }).catch(() => 0);

    const totalJobs = await db.job.count({ where: { status: "active" } }).catch(() => 0);

    const urgency = getUrgencyState(featuredCount);

    return NextResponse.json({
      success: true,
      featured: urgency,
      stats: { totalJobs, featuredCount },
      prices: { weekly: FEATURED_CONFIG.priceWeekly, monthly: FEATURED_CONFIG.priceMonthly },
      // No synthetic discount — value prop is static and honest
      note: urgency.campaignEndsAt ? `Campaign ends ${urgency.campaignEndsAt}` : null,
    });
  } catch {
    return NextResponse.json({ success: false, featured: getUrgencyState(0) }, { status: 200 });
  }
}
