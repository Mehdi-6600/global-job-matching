import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { chatCompletionWithMeta } from "@/lib/ai";
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
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { neutralizeInstructionish } from "@/lib/ai-sanitize";

const SYSTEM_PROMPT = `You are a careful career-risk analyst focused on the next 5–10 years.

Rules:
- Analyze THIS specific job title and the user's skills, experience, industry, country, location, and education.
- Distinguish task automation from total job elimination.
- Consider human judgment, physical presence, regulation, social interaction, and responsibility.
- Consider both AI copilots and autonomous agents.
- Do NOT invent labor-market statistics or claim a job will definitely disappear.
- Do NOT replace the user's job title with a different title.
- Provide realistic skills to build and realistic adjacent roles in "alternatives".

Reply with ONLY valid JSON (no markdown fences):
{
  "riskScore": 0-100,
  "summary": "2-4 balanced sentences",
  "reasons": ["up to 6 concrete reasons"],
  "skillsToBuild": ["up to 8 skills"],
  "alternatives": ["up to 6 adjacent roles"],
  "subScores": {
    "taskAutomation": 0-100,
    "toolMaturity": 0-100,
    "marketAdoption": 0-100,
    "agenticExposure": 0-100
  },
  "timeHorizon": "5–10 years",
  "confidence": 0-100,
  "industryOutlook": "optional short string"
}

subScores meaning:
- taskAutomation: share of core tasks AI could do end-to-end reliably today
- toolMaturity: maturity of tools for those tasks
- marketAdoption: how widely employers already use such tools
- agenticExposure: exposure to autonomous multi-step agents (not only chat copilots)
riskScore must be consistent with subScores.`;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await aiRatelimit.limit(
      `career_risk_list_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    try {
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
    } catch (listErr) {
      console.error("Career risk list DB error:", listErr);
      return NextResponse.json({ assessments: [] });
    }
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
    const limit = await aiRatelimit.limit(
      `career_risk_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests. Please wait.");
    }

    const body = await readJsonBody(req);
    if (body === null) {
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

    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(0, 120);
    const skills = parsed.data.skills
      ? neutralizeInstructionish(parsed.data.skills).slice(0, 1500)
      : undefined;
    const industry = parsed.data.industry
      ? neutralizeInstructionish(parsed.data.industry).slice(0, 120)
      : undefined;
    const country = parsed.data.country
      ? neutralizeInstructionish(parsed.data.country).slice(0, 120)
      : undefined;
    const location = parsed.data.location
      ? neutralizeInstructionish(parsed.data.location).slice(0, 200)
      : undefined;
    const education = parsed.data.education
      ? neutralizeInstructionish(parsed.data.education).slice(0, 200)
      : undefined;
    const experienceYears = parsed.data.experienceYears;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let effectivePlan = "free";
    try {
      const effective = await getEffectivePlan(user.id);
      effectivePlan = effective.plan;
    } catch (planErr) {
      console.error("getEffectivePlan failed, using free:", planErr);
      effectivePlan = String(user.plan || "free").toLowerCase();
    }
    const paid = isPaidPlan(effectivePlan);

    // Quota reservation MUST succeed before any AI call (no silent bypass)
    try {
      const reserveResult = await db.$transaction(async (tx) => {
        await lockUserRow(tx, user.id);
        return assertAndReserveAiUsage(tx, {
          userId: user.id,
          plan: effectivePlan,
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
    } catch (quotaErr) {
      console.error("Career risk quota reserve failed:", quotaErr);
      return NextResponse.json(
        {
          error: "Service temporarily unavailable. Please try again shortly.",
          code: "QUOTA_INFRA_ERROR",
        },
        { status: 503 }
      );
    }

    const userPrompt = `Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Country: ${country || "n/a"}
Location: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;
    let aiMeta: { provider: string; model: string | null; latencyMs: number } | null =
      null;

    try {
      const { text, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1100, temperature: 0.35, timeoutMs: 25_000 }
      );
      aiMeta = {
        provider: meta.provider,
        model: meta.model,
        latencyMs: meta.latencyMs,
      };
      if (text) {
        result = parseRiskJson(text, jobTitle);
        if (!result) {
          console.error("Career risk AI parse/validation failed", {
            provider: meta.provider,
            model: meta.model,
            latencyMs: meta.latencyMs,
          });
        }
      } else {
        console.error("Career risk AI empty", meta);
      }
    } catch (aiErr) {
      console.error("Career risk AI call failed:", aiErr);
      result = null;
    }

    // AI failed → release quota → heuristic (source must stay heuristic)
    if (!result) {
      if (reservedEventId && reservedUserId) {
        try {
          await db.$transaction(async (tx) => {
            await releaseUsageEventById(tx, {
              userId: reservedUserId!,
              usageEventId: reservedEventId!,
            });
          });
        } catch (releaseErr) {
          console.error("Release unused AI quota failed:", releaseErr);
        }
        reservedEventId = null;
      }
      result = heuristicCareerRisk(jobTitle, skills, {
        industry,
        experienceYears,
        country,
      });
    }

    if (!result?.summary) {
      result = heuristicCareerRisk(jobTitle, skills, {
        industry,
        experienceYears,
        country,
      });
    }

    // Always keep user title
    result = { ...result, jobTitle };

    const shareToken = randomBytes(18).toString("hex");
    let assessmentId: string | undefined;
    let savedShareToken: string | undefined = shareToken;

    try {
      const saved = await db.careerRiskAssessment.create({
        data: {
          userId: user.id,
          jobTitle: result.jobTitle,
          skills: skills || null,
          industry: industry || null,
          experienceYears:
            typeof experienceYears === "number" ? experienceYears : null,
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
      assessmentId = saved.id;
      savedShareToken = saved.shareToken;
    } catch (saveErr) {
      console.error(
        "Career risk save failed (returning analysis anyway):",
        saveErr
      );
      savedShareToken = undefined;
      assessmentId = undefined;
    }

    if (aiMeta && result.source === "ai") {
      console.info("Career risk AI ok", {
        provider: aiMeta.provider,
        model: aiMeta.model,
        latencyMs: aiMeta.latencyMs,
        score: result.riskScore,
      });
    }

    return NextResponse.json(
      toSuccessResponse({
        analysis: result,
        paid,
        assessmentId,
        shareToken: savedShareToken,
      })
    );
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
      {
        error:
          "Failed to analyze career risk. Please try again in a moment.",
        code: "CAREER_RISK_INTERNAL",
      },
      { status: 500 }
    );
  }
}
