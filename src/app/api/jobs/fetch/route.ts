import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { fetchAllJobs } from "@/lib/jobs/fetcher";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { success } = await ratelimit.limit(
      `jobs_fetch_admin_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || undefined;
    const location = searchParams.get("location") || undefined;

    const { jobs } = await fetchAllJobs({ page: 1, perPage: 100 });

    let filtered = jobs;
    if (title) {
      const t = title.toLowerCase();
      filtered = filtered.filter((j) => j.title.toLowerCase().includes(t));
    }
    if (location) {
      const l = location.toLowerCase();
      filtered = filtered.filter((j) =>
        j.location.toLowerCase().includes(l)
      );
    }

    return NextResponse.json({
      jobs: filtered,
      total: filtered.length,
    });
  } catch (error: unknown) {
    console.error("Fetch jobs error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
