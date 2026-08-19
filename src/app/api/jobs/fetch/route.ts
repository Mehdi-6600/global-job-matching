import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/jobs/fetcher";
import { matchJobs, type UserProfile } from "@/lib/jobs/matcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, location, skills, salaryMin, radius } = body;

    // Validate input
    if (!title || !location || !skills || !Array.isArray(skills)) {
      return NextResponse.json(
        { error: "Missing required fields: title, location, skills" },
        { status: 400 }
      );
    }

    // Fetch jobs from all sources
    const allJobs = await fetchAllJobs(title, location);

    if (allJobs.length === 0) {
      return NextResponse.json(
        { jobs: [], total: 0, message: "No jobs found for your criteria" },
        { status: 200 }
      );
    }

    // Create user profile
    const userProfile: UserProfile = {
      title,
      skills: skills.map((s: string) => s.toLowerCase()),
      location,
      radius: radius || 50,
      salaryMin: salaryMin || undefined,
    };

    // Match jobs
    const matchedJobs = matchJobs(userProfile, allJobs);

    // Group by source for analytics
    const bySource = {
      arbeitnow: matchedJobs.filter((m) => m.job.source === "arbeitnow")
        .length,
      jooble: matchedJobs.filter((m) => m.job.source === "jooble").length,
      remoteok: matchedJobs.filter((m) => m.job.source === "remoteok").length,
    };

    return NextResponse.json(
      {
        jobs: matchedJobs,
        total: matchedJobs.length,
        stats: {
          fetched: allJobs.length,
          matched: matchedJobs.length,
          matchPercentage: Math.round(
            (matchedJobs.length / allJobs.length) * 100
          ),
          bySource,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
