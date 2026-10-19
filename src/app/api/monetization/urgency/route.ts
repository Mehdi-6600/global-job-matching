import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FEATURED_CONFIG, getUrgencyState } from "@/lib/monetization/featured-urgency";

/**
 * Public urgency endpoint — powers homepage banner + pricing scarcity.
 * Caches cheap: count featured jobs + applicant stats.
 */
export async function GET() {
  try {
    const featuredCount = await db.job.count({
      where: { featured: true, featuredUntil: { gte: new Date() }, status: "active" },
    }).catch(() => 0);

    const totalJobs = await db.job.count({ where: { status: "active" } }).catch(() => 0);
    const totalApps = await db.application.count({}).catch(() => 0);

    const urgency = getUrgencyState(featuredCount);

    return NextResponse.json({
      success: true,
      featured: urgency,
      stats: { totalJobs, totalApps, featuredCount },
      prices: { weekly: FEATURED_CONFIG.priceWeekly, monthly: FEATURED_CONFIG.priceMonthly },
      competitor: { name: "CryptoJobsList", price: FEATURED_CONFIG.competitorPrice },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed", featured: getUrgencyState(0) }, { status: 200 });
  }
}
