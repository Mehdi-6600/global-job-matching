import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { computeMatchScore } from "@/lib/matching/score";

/**
 * Match % for the current user against a single job.
 * GET /api/jobs/[id]/match
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job id required" }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `match_one_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [profile, job] = await Promise.all([
      db.profile.findUnique({
        where: { userId: session.user.id },
        select: {
          skills: true,
          bio: true,
          experience: true,
          education: true,
          location: true,
        },
      }),
      db.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          remote: true,
          experience: true,
          requirements: true,
          tags: true,
          type: true,
          status: true,
        },
      }),
    ]);

    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!profile) {
      return NextResponse.json({
        jobId: job.id,
        profileComplete: false,
        match: null,
        message: "Create a profile to see your match score.",
      });
    }

    const match = computeMatchScore(profile, {
      title: job.title,
      description: job.description,
      location: job.location,
      remote: job.remote,
      experience: job.experience,
      requirements: job.requirements,
      tags: job.tags,
      type: job.type,
    });

    return NextResponse.json({
      jobId: job.id,
      profileComplete: true,
      match,
    });
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
