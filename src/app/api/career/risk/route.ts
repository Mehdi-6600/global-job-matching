import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";
import { chatCompletion } from "@/lib/ai";
import {
  heuristicCareerRisk,
  isPaidPlan,
  parseRiskJson,
} from "@/lib/career-risk";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import {
  assertAndReserveAiUsage,
  lockUserRow,
  releaseLatestUsageEvent,
} from "@/lib/quota";

const schema = z.object({
  jobTitle: z.string().min(2).max(120),
  skills: z.string().max(1500).optional().or(z.literal("")),
  experienceYears: z.number().min(0).max(50).optional(),
  industry: z.string().max(120).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `career_risk_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { jobTitle, skills, experienceYears, industry } = parsed.data;

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

    const system = `You are a careful labor-market analyst. Estimate how exposed a job is to AI/automation in the next 5–10 years.
Return ONLY valid JSON (no markdown) with this shape:
{
  "jobTitle": string,
  "riskScore": number 0-100,
  "riskLevel": "low" | "medium" | "high",
  "summary": string,
  "reasons": string[],
  "skillsToBuild": string[],
  "alternatives": string[]
}
Be balanced. Do not claim certainty. alternatives should be realistic career pivots.`;

    const userMsg = `Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Years of experience: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}`;

    const aiRaw = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { maxTokens: 1200, temperature: 0.4 }
    );

    let result =
      parseRiskJson(aiRaw || "", jobTitle) ||
      heuristicCareerRisk(jobTitle, skills);

    const usedAiCall = Boolean(aiRaw && result.source === "ai");

    if (!usedAiCall) {
      // Heuristic only — do not consume AI quota
      await db.$transaction(async (tx) => {
        await releaseLatestUsageEvent(tx, {
          userId: user.id,
          kind: "ai_career_risk",
        });
      });
    }

    if (!paid) {
      result = {
        ...result,
        alternatives: [],
      };
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      alternativesLocked: !paid,
      plan: effective.plan,
      message: paid
        ? "Full analysis including alternative careers"
        : "Risk analysis is free. Upgrade your plan to unlock alternative career suggestions.",
    });
  } catch (error) {
    console.error("career risk error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
