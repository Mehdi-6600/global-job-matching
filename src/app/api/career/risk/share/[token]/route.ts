import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { safeLimit } from "@/lib/safe-ratelimit";
import { rateLimitedResponse } from "@/lib/http";
import { isPrismaNotFoundLike } from "@/lib/prisma-errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getRequestIp(req);
    const limit = await safeLimit(ratelimit, `career_share_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    const { token } = await params;
    const shareToken = (token || "").trim();
    if (!shareToken || shareToken.length < 10 || shareToken.length > 128) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Reject obviously non-hex tokens early (share tokens are randomBytes hex)
    if (!/^[a-zA-Z0-9_-]+$/.test(shareToken)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let row;
    try {
      row = await db.careerRiskAssessment.findUnique({
        where: { shareToken },
        select: {
          id: true,
          jobTitle: true,
          riskScore: true,
          riskLevel: true,
          summary: true,
          reasons: true,
          skillsToBuild: true,
          alternatives: true,
          paidSnapshot: true,
          source: true,
          createdAt: true,
        },
      });
    } catch (dbErr) {
      console.error("Career risk share DB error:", dbErr);
      if (isPrismaNotFoundLike(dbErr)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // Table missing / connection issues — soft 404 for public share links
      // (avoid leaking infra details; analysis still works without persistence)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const reasons = Array.isArray(row.reasons) ? row.reasons : [];
    const skillsToBuild = Array.isArray(row.skillsToBuild)
      ? row.skillsToBuild
      : [];
    const alternatives = Array.isArray(row.alternatives)
      ? row.alternatives
      : [];

    return NextResponse.json({
      success: true,
      assessment: {
        id: row.id,
        jobTitle: row.jobTitle,
        riskScore: row.riskScore,
        riskLevel: row.riskLevel,
        summary: row.summary,
        reasons,
        skillsToBuild,
        alternatives: row.paidSnapshot ? alternatives : [],
        alternativesLocked: !row.paidSnapshot,
        source: row.source,
        createdAt: row.createdAt,
      },
    });
  } catch (error) {
    console.error("Career risk share GET error:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
