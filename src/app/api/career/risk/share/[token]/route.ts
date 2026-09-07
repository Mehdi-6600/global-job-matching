import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(`career_share_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { token } = await params;
    const shareToken = (token || "").trim();
    if (!shareToken || shareToken.length < 10) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = await db.careerRiskAssessment.findUnique({
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

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: row.id,
        jobTitle: row.jobTitle,
        riskScore: row.riskScore,
        riskLevel: row.riskLevel,
        summary: row.summary,
        reasons: row.reasons,
        skillsToBuild: row.skillsToBuild,
        alternatives: row.paidSnapshot ? row.alternatives : [],
        alternativesLocked: !row.paidSnapshot,
        source: row.source,
        createdAt: row.createdAt,
      },
    });
  } catch (error) {
    console.error("Career risk share GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
