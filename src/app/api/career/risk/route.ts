import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { chatCompletionWithMeta } from "@/lib/ai";
import {
  heuristicCareerRisk,
  isPaidPlan,
  languageNameForPrompt,
  normalizeCareerLocale,
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

async function safeRateLimit(key: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  infraFailed?: boolean;
}> {
  try {
    const r = await aiRatelimit.limit(key);
    return {
      success: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
    };
  } catch (err) {
    console.error("Career risk rate limit infra error:", err);
    // Fail closed for AI-heavy endpoint: treat as limited rather than unlimited
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60_000,
      infraFailed: true,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await safeRateLimit(
      `career_risk_list_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
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
    const limit = await safeRateLimit(
      `career_risk_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(
        limit,
        limit.infraFailed
          ? "Rate limiter unavailable. Please try again shortly."
          : "Too many requests. Please wait."
      );
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

    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      120
    );
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
    const locale = normalizeCareerLocale(parsed.data.locale);
    const languageName = languageNameForPrompt(locale);

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

    // --- Quota: A exceeded → 403, B infra fail → 503, C ok → AI may run ---
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
            code: reserveResult.code || "PLAN_LIMIT_AI",
            limit: reserveResult.limit,
            used: reserveResult.used,
          },
          { status: 403 }
        );
      }

      reservedEventId = reserveResult.usageEventId ?? null;
      reservedUserId = user.id;
    } catch (quotaErr) {
      console.error("Career risk quota infra failure:", quotaErr);
      return NextResponse.json(
        {
          error:
            "Service temporarily unavailable. Please try again shortly.",
          code: "QUOTA_INFRA_ERROR",
        },
        { status: 503 }
      );
    }

    const systemPrompt = `You are a careful career-risk analyst for the next 5–10 years.

CRITICAL LANGUAGE RULE:
- Write summary, reasons, skillsToBuild, alternatives, and industryOutlook ENTIRELY in ${languageName}.
- JSON keys stay in English.

Rules:
- Analyze THIS job title plus skills, experience, industry, country, city/location, and education.
- Explicitly reflect how the local market (${country || "n/a"} / ${location || "n/a"}) affects demand and automation pressure.
- Do NOT invent statistics. Do NOT replace the user's job title.
- Distinguish task automation from total job elimination.

Reply with ONLY valid JSON (no markdown):
{
  "riskScore": 0-100,
  "summary": "2-4 sentences including location context when provided",
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
  "industryOutlook": "short string with industry + location nuance"
}
riskScore must be consistent with subScores. All subScores are required.`;

    const userPrompt = `Response language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Country: ${country || "n/a"}
City/Location: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;

    try {
      const { text, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1100, temperature: 0.35, timeoutMs: 20_000, maxAttempts: 3 }
      );

      if (text) {
        result = parseRiskJson(text, jobTitle);
        if (result) {
          console.info("Career risk AI ok", {
            provider: meta.provider,
            model: meta.model,
            latencyMs: meta.latencyMs,
            attempt: meta.attempt,
            locale,
          });
        }
      } else {
        console.error("Career risk AI empty", {
          error: meta.error,
          attempt: meta.attempt,
        });
      }
    } catch (aiErr) {
      console.error("Career risk AI call failed:", aiErr);
      result = null;
    }

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
        location,
        education,
        locale,
      });
    }

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

    return NextResponse.json(
      toSuccessResponse({
        analysis: result,
        paid,
        assessmentId,
        shareToken: savedShareToken,
        locale,
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
