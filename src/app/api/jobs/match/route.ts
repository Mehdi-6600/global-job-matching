import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rankJobsByMatch } from "@/lib/job-matching";
import { normalizeLocation } from "@/lib/location";
import { getRequestIp } from "@/lib/client-ip";
import { strictRatelimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Intelligent candidate retrieval:
 * - Prefer jobs matching profile location / remote
 * - Prefer jobs whose tags/requirements overlap skills tokens
 * - Always include a recent window so new jobs are visible
 * - Cap total candidates for latency, but not "only newest 120 blindly"
 */
async function loadCandidateJobs(profile: {
  skills?: string | null;
  location?: string | null;
}) {
  const skillHints = (profile.skills || "")
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 8);

  const location = profile.location?.trim();

  const orFilters: object[] = [{ remote: true }];
  if (location) {
    orFilters.push({
      location: { contains: location, mode: "insensitive" },
    });
  }
  for (const skill of skillHints) {
    orFilters.push({ tags: { has: skill } });
    orFilters.push({
      title: { contains: skill, mode: "insensitive" },
    });
  }

  const select = {
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
  } as const;

  const [focused, recent] = await Promise.all([
    db.job.findMany({
      where: {
        status: "active",
        OR: orFilters,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select,
    }),
    db.job.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select,
    }),
  ]);

  const byId = new Map<string, (typeof recent)[number]>();
  for (const j of [...focused, ...recent]) {
    byId.set(j.id, j);
  }
  return Array.from(byId.values());
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await strictRatelimit.limit(
      `jobs_match_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const minScore = Math.max(
      0,
      Math.min(100, Number(searchParams.get("minScore") || 15))
    );
    const limit = Math.max(
      1,
      Math.min(50, Number(searchParams.get("limit") || 20))
    );

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            skills: true,
            bio: true,
            experience: true,
            education: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Do NOT invent a job title from skills or display name.
    // Title affinity only applies when a real title exists (currently optional).
    const profile = {
      skills: user.profile?.skills || null,
      title: null as string | null,
      bio: user.profile?.bio || null,
      experience: user.profile?.experience || null,
      education: user.profile?.education || null,
      location: user.profile?.location || null,
    };

    const jobs = await loadCandidateJobs(profile);

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
      candidatesConsidered: jobs.length,
      results,
      profileHints: {
        hasSkills: Boolean(profile.skills?.trim()),
        hasLocation: Boolean(profile.location?.trim()),
        hasTitle: Boolean(profile.title?.trim()),
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
