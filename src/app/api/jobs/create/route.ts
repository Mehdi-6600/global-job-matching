import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeLocation } from "@/lib/location";
import { createJobForUser } from "@/services/jobs/create-job";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

// ---------------------------------------------------------------------------
// POST /api/jobs (Legacy)
//
// مسیر قدیمی — نباید بررسی‌های plan یا ownership را دور بزند.
// مسیر ترجیحی: POST /api/employer/jobs
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1) Auth
    // -----------------------------------------------------------------------
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -----------------------------------------------------------------------
    // 2) Rate limit (per user + IP)
    // -----------------------------------------------------------------------
    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(
      `jobs_create_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    // -----------------------------------------------------------------------
    // 3) Parse JSON body
    // -----------------------------------------------------------------------
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 4) Delegate to service (plan + ownership checks enforced there)
    // -----------------------------------------------------------------------
    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email ?? null,
      },
      body
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          details: result.details,
          limit: result.limit,
          used: result.used,
        },
        { status: result.status }
      );
    }

    // -----------------------------------------------------------------------
    // 5) Success response (normalize location for consistency)
    // -----------------------------------------------------------------------
    const job = result.job;
    return NextResponse.json({
      success: true,
      job: {
        ...job,
        location: normalizeLocation(job.location) || job.location,
      },
    });
  } catch (error) {
    console.error("[jobs/create] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
