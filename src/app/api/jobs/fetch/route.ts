import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { fetchAllJobs } from "@/lib/jobs/fetcher";
import { getRequestIp } from "@/lib/client-ip";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getRequestIp(request);
    const { success } = await ratelimit.limit(
      `jobs_fetch_admin_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || undefined;
    const location = searchParams.get("location") || undefined;

    const jobs = await fetchAllJobs({ title, location });

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch external jobs" },
      { status: 500 }
    );
  }
}
