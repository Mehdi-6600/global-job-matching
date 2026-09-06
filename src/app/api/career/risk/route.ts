import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { aiRatelimit } from "@/lib/ratelimit";
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

    let reserved = true;

    const systemPrompt = `You are a career risk analyst. Reply with ONLY valid JSON:
{"riskScore":0-100,"level":"low|medium|high|critical","summary":"...","reasons":["..."],"suggestions":["..."],"alternativeRoles":["..."]}`;

    const userPrompt = `Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Plan paid: ${paid}`;

    let aiText = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 900, temperature: 0.4 }
    );

    let result = aiText ? parseRiskJson(aiText) : null;
    let source: "ai" | "heuristic" = "ai";

    if (!result) {
      source = "heuristic";
      if (reserved) {
        await db.$transaction(async (tx) => {
          await releaseLatestUsageEvent(tx, {
            userId: user.id,
            kind: "ai_career_risk",
          });
        });
        reserved = false;
      }
      result = heuristicCareerRisk({
        jobTitle,
        skills,
        experienceYears,
        industry,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      source,
      paid,
      alternativesLocked: !paid,
      message: paid
        ? undefined
        : "Upgrade to Pro to unlock alternative role recommendations detail.",
    });
  } catch (error) {
    console.error("Career risk error:", error);
    return NextResponse.json(
      { error: "Failed to analyze career risk" },
      { status: 500 }
    );
  }
}
