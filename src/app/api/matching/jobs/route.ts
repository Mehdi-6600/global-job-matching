import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { computeMatchScore } from "@/lib/matching/score";
import { normalizeLocation } from "@/lib/location";

/**
 * Personalized job feed with match %.
 * GET /api/matching/jobs?limit=20&minScore=40
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `match_jobs_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20) || 20)
    );
    const minScore = Math.min(
      100,
      Math.max(0, Number(searchParams.get("minScore") || 0) || 0)
    );

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        skills: true,
        bio: true,
        experience: true,
        education: true,
        location: true,
      },
    });

    if (!profile?.skills && !profile?.bio) {
      return NextResponse.json({
        jobs: [],
        message:
          "Complete your profile (skills/bio) to see personalized match scores.",
        profileComplete: false,
      });
    }

    const jobs = await db.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 120,
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
        salary: true,
        salaryMin: true,
        salaryMax: true,
        company: {
          select: { id: true, name: true, logo: true },
        },
      },
    });

    const ranked = jobs
      .map((job) => {
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
        return {
          id: job.id,
          title: job.title,
          location: normalizeLocation(job.location) || job.location,
          remote: job.remote,
          type: job.type,
          salary: job.salary,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          company: job.company,
          match,
        };
      })
      .filter((j) => j.match.score >= minScore)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, limit);

    return NextResponse.json({
      jobs: ranked,
      profileComplete: true,
      count: ranked.length,
    });
  } catch (error) {
    console.error("Matching jobs error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
