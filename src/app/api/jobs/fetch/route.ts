import { NextRequest, NextResponse } from "next/server";
import { fetchAllJobs } from "@/lib/jobs/fetcher";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || undefined;
  const location = searchParams.get("location") || undefined;

  try {
    // Fetch jobs from Arbeitnow (broad search, filter client-side if needed)
    const { jobs } = await fetchAllJobs({ page: 1, perPage: 100 });

    // Optional: client-side filtering by title/location
    let filtered = jobs;
    if (title) {
      const t = title.toLowerCase();
      filtered = filtered.filter((j) => j.title.toLowerCase().includes(t));
    }
    if (location) {
      const l = location.toLowerCase();
      filtered = filtered.filter((j) => j.location.toLowerCase().includes(l));
    }

    return NextResponse.json({
      jobs: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("Fetch jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
