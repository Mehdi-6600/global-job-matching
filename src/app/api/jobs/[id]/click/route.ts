import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { jobIdSchema } from "@/lib/validation/job-id";

/**
 * Track job apply-click for affiliate monetization.
 * Future: redirect via affiliate network (JoinTalent/ Talent.com).
 * Currently: counts click, logs for revenue simulation, returns applyUrl.
 * Proves demand even before real affiliate contract.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const parsed = jobIdSchema.safeParse(rawId);
  if (!parsed.success) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });

  const ip = getRequestIp(req);
  const limit = await ratelimit.limit(`job_click_${parsed.data}_${ip}`);
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const job = await db.job.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      title: true,
      viewCount: true,
      sourceListings: { select: { applyUrl: true, sourceUrl: true }, take: 1 },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // increment view as click-signal (no separate Click table yet)
  await db.job.update({ where: { id: job.id }, data: { viewCount: { increment: 1 } } });

  const target = job.sourceListings[0]?.applyUrl || job.sourceListings[0]?.sourceUrl || null;

  return NextResponse.json({
    success: true,
    jobId: job.id,
    applyUrl: target,
    // affiliate-ready: add ?subId=gjm_... when contract live
    affiliateHint: target ? `${target}${target.includes("?") ? "&" : "?"}utm_source=global-job-matching&utm_medium=affiliate` : null,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Support GET redirect for email CTAs
  const { id: rawId } = await params;
  const parsed = jobIdSchema.safeParse(rawId);
  if (!parsed.success) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });

  const job = await db.job.findUnique({
    where: { id: parsed.data },
    select: { id: true, sourceListings: { select: { applyUrl: true, sourceUrl: true }, take: 1 } },
  });
  const target = job?.sourceListings[0]?.applyUrl || job?.sourceListings[0]?.sourceUrl;
  if (!target) return NextResponse.json({ error: "No apply URL" }, { status: 404 });

  await db.job.update({ where: { id: job!.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  return NextResponse.redirect(target, 302);
}
