import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse } from "@/lib/http";
import { normalizeLocation } from "@/lib/location";
import { rankJobsByMatch } from "@/lib/job-matching";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  minScore: z.coerce.number().min(0).max(100).default(25),
});

/**
 * GET /api/jobs/match
 * Rank active jobs against the signed-in user's profile (no AI).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limitRes = await ratelimit.limit(
      `jobs_match_${session.user.id}_${ip}`
    );
    if (!limitRes.success) {
      return rateLimitedResponse(limitRes);
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, minScore } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        profile: {
          select: {
            bio: true,
            skills: true,
            experience: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = {
      skills: user.profile?.skills || null,
      title: user.profile?.skills || user.name || null,
      bio: user.profile?.bio || null,
      experience: user.profile?.experience || null,
      location: user.profile?.location || null,
    };

    // Cap candidate set for performance (deterministic ranking on recent active jobs)
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
        tags: true,
        requirements: true,
        type: true,
        experience: true,
        salaryMin: true,
        salaryMax: true,
        createdAt: true,
        company: {
          select: { id: true, name: true, logo: true, location: true },
        },
      },
    });

    const ranked = rankJobsByMatch(
      profile,
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        location: j.location,
        remote: j.remote,
        tags: j.tags,
        requirements: j.requirements,
        type: j.type,
        experience: j.experience,
        company: j.company,
      })),
      { minScore, limit }
    );

    const byId = new Map(jobs.map((j) => [j.id, j]));
    const results = ranked
      .map((r) => {
        const job = byId.get(r.jobId);
        if (!job) return null;
        return {
          score: r.score,
          reasons: r.reasons,
          matchedSkills: r.matchedSkills,
          missingSkills: r.missingSkills,
          job: {
            ...job,
            location: normalizeLocation(job.location) || job.location,
            company: job.company
              ? {
                  ...job.company,
                  location: normalizeLocation(job.company.location),
                }
              : job.company,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      engine: "deterministic-v1",
      count: results.length,
      results,
      profileHints: {
        hasSkills: Boolean(profile.skills?.trim()),
        hasLocation: Boolean(profile.location?.trim()),
      },
    });
  } catch (error) {
    console.error("Jobs match error:", error);
    return NextResponse.json(
      { error: "Failed to rank jobs" },
      { status: 500 }
    );
  }
}
