import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { computeMatchScore } from "@/lib/match-score";
import { jobIdSchema } from "@/lib/validation/job-id";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `job_match_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: rawId } = await params;
    const parsedId = jobIdSchema.safeParse(rawId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await db.job.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        remote: true,
        experience: true,
        requirements: true,
        tags: true,
        status: true,
      },
    });

    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        skills: true,
        experience: true,
        location: true,
        bio: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        match: null,
        message:
          "Complete your profile to see a match score for this job.",
      });
    }

    const match = computeMatchScore(profile, job);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      match,
    });
  } catch (error) {
    console.error("Job match error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
