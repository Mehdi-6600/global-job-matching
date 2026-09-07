import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { chatCompletion } from "@/lib/ai";
import {
  heuristicCareerRisk,
  isPaidPlan,
  parseRiskJson,
  toSuccessResponse,
} from "@/lib/career-risk";
import { careerRiskRequestSchema } from "@/types/career-risk";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import {
  assertAndReserveAiUsage,
  lockUserRow,
  releaseUsageEventById,
} from "@/lib/quota";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await aiRatelimit.limit(
      `career_risk_list_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const items = await db.careerRiskAssessment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        jobTitle: true,
        riskScore: true,
        riskLevel: true,
        summary: true,
        paidSnapshot: true,
        shareToken: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      assessments: items.map((a) => ({
        ...a,
        sharePath: `/career-risk/share/${a.shareToken}`,
      })),
    });
  } catch (error) {
    console.error("Career risk list error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let reservedEventId: string | null = null;
  let reservedUserId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const ip = getRequestIp(req);
    const { success } = await aiRatelimit.limit(
      `career_risk_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = careerRiskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      jobTitle,
      skills,
      experienceYears,
      industry,
      country,
      location,
      education,
    } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const effective = await getEffectivePlan(user.id);
    const paid = isPaidPlan(effective.plan);

    const reserveResult = await db.$transaction(async (tx) => {
      await lockUserRow(tx, user.id);
      return assertAndReserveAiUsage(tx, {
        userId: user.id,
        plan: effective.plan,
        kind: "ai_career_risk",
        meta: jobTitle,
      });
    });

    if (!reserveResult.ok) {
      return NextResponse.json(
        {
          error: reserveResult.error,
          code: reserveResult.code,
          limit: reserveResult.limit,
          used: reserveResult.used,
        },
        { status: 403 }
      );
    }

    reservedEventId = reserveResult.usageEventId ?? null;
    reservedUserId = user.id;

    const systemPrompt = `You are a career risk analyst for the next 5–10 years.
Reply with ONLY valid JSON (no markdown):
{
  "jobTitle": "string",
  "riskScore": 0-100,
  "riskLevel": "low" | "medium" | "high",
  "summary": "string",
  "reasons": ["string"],
  "skillsToBuild": ["string"],
  "alternatives": ["string"]
}
Be balanced and avoid absolute claims about unemployment.`;

    const userPrompt = `Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Country: ${country || "n/a"}
Location: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;

    try {
      const aiText = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 900, temperature: 0.4 }
      );
      result = aiText ? parseRiskJson(aiText, jobTitle) : null;
    } catch (aiErr) {
      console.error("Career risk AI call failed:", aiErr);
      result = null;
    }

    if (!result) {
      if (reservedEventId && reservedUserId) {
        await db.$transaction(async (tx) => {
          await releaseUsageEventById(tx, {
            userId: reservedUserId!,
            usageEventId: reservedEventId!,
          });
        });
        reservedEventId = null;
      }
      result = heuristicCareerRisk(jobTitle, skills || undefined);
    }

    const shareToken = randomBytes(18).toString("hex");

    const saved = await db.careerRiskAssessment.create({
      data: {
        userId: user.id,
        jobTitle: result.jobTitle,
        skills: skills || null,
        industry: industry || null,
        experienceYears: experienceYears ?? null,
        country: country || null,
        location: location || null,
        education: education || null,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        summary: result.summary,
        reasons: result.reasons,
        skillsToBuild: result.skillsToBuild,
        alternatives: paid ? result.alternatives : [],
        source: result.source,
        paidSnapshot: paid,
        shareToken,
      },
      select: { id: true, shareToken: true },
    });

    const payload = toSuccessResponse({
      analysis: result,
      paid,
      assessmentId: saved.id,
      shareToken: saved.shareToken,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Career risk error:", error);
    if (reservedEventId && reservedUserId) {
      try {
        await db.$transaction(async (tx) => {
          await releaseUsageEventById(tx, {
            userId: reservedUserId!,
            usageEventId: reservedEventId!,
          });
        });
      } catch (releaseErr) {
        console.error("Failed to release AI quota reservation:", releaseErr);
      }
    }
    return NextResponse.json(
      { error: "Failed to analyze career risk" },
      { status: 500 }
    );
  }
}
