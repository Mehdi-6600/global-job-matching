import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `job_match_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await context.params;

    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        tags: true,
        location: true,
        remote: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      jobId: job.id,
      matchScore: null,
      message:
        "Match engine placeholder — profile/job compared when matcher is fully enabled.",
      hasProfile: Boolean(profile),
    });
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
