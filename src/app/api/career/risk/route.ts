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
  scoreToRiskLevel,
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

async function checkAiRateLimit(key: string): Promise<{
  blocked: boolean;
  limit?: {
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
  };
}> {
  try {
    const limit = await aiRatelimit.limit(key);
    if (!limit.success) return { blocked: true, limit };
    return { blocked: false, limit };
  } catch (err) {
    console.error("Career risk rate limit infra error (fail-open):", err);
    return { blocked: false };
  }
}

/**
 * Try to reserve quota.
 * - denied (limit hit) → block AI
 * - infra error → still allow AI (best-effort, log only)
 */
async function tryReserveAiQuota(params: {
  userId: string;
  plan: string;
  jobTitle: string;
}): Promise<
  | { allowAi: true; usageEventId: string | null }
  | { allowAi: false; error: string; code: string; limit?: number; used?: number }
> {
  try {
    const result = await db.$transaction(async (tx) => {
      try {
        await lockUserRow(tx, params.userId);
      } catch {
        /* Neon pooler may reject FOR UPDATE — continue */
      }
      return assertAndReserveAiUsage(tx, {
        userId: params.userId,
        plan: params.plan,
        kind: "ai_career_risk",
        meta: params.jobTitle,
      });
    });

    if (!result.ok) {
      return {
        allowAi: false,
        error: result.error,
        code: result.code || "PLAN_LIMIT_AI",
        limit: result.limit,
        used: result.used,
      };
    }
    return { allowAi: true, usageEventId: result.usageEventId ?? null };
  } catch (err) {
    console.error(
      "Quota reserve failed — allowing AI without ledger entry:",
      err
    );
    // Still allow online AI; do not brick the product
    return { allowAi: true, usageEventId: null };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const rl = await checkAiRateLimit(
      `career_risk_list_${session.user.id}_${ip}`
    );
    if (rl.blocked && rl.limit) {
      return rateLimitedResponse(rl.limit, "Too many requests");
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
    } catch {
      return NextResponse.json({ assessments: [] });
    }
  } catch {
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
    const rl = await checkAiRateLimit(
      `career_risk_${session.user.id}_${ip}`
    );
    if (rl.blocked && rl.limit) {
      return rateLimitedResponse(
        rl.limit,
        "Too many requests. Please wait a minute and try again."
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
    } catch {
      effectivePlan = String(user.plan || "free").toLowerCase();
    }
    const paid = isPaidPlan(effectivePlan);

    const quota = await tryReserveAiQuota({
      userId: user.id,
      plan: effectivePlan,
      jobTitle,
    });

    if (!quota.allowAi) {
      return NextResponse.json(
        {
          error: quota.error,
          code: quota.code,
          limit: quota.limit,
          used: quota.used,
        },
        { status: 403 }
      );
    }

    reservedEventId = quota.usageEventId;
    reservedUserId = user.id;

    // ——— Always attempt online AI first ———
    const systemPrompt = `You are a careful career-risk analyst for the next 5–10 years.

CRITICAL: Write summary, reasons, skillsToBuild, alternatives, industryOutlook ENTIRELY in ${languageName}.
JSON keys stay in English.

Analyze this specific role using skills, experience, industry, country, and city.
Mention local market context when country/city are provided.
Do not invent statistics. Do not change the job title.

Reply with ONLY valid JSON:
{
  "riskScore": 0-100,
  "summary": "2-4 sentences",
  "reasons": ["up to 6 reasons"],
  "skillsToBuild": ["up to 8 skills"],
  "alternatives": ["up to 6 roles"],
  "subScores": {
    "taskAutomation": 0-100,
    "toolMaturity": 0-100,
    "marketAdoption": 0-100,
    "agenticExposure": 0-100
  },
  "timeHorizon": "5–10 years",
  "confidence": 0-100,
  "industryOutlook": "short string"
}`;

    const userPrompt = `Language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Country: ${country || "n/a"}
City: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;

    try {
      const { text, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          maxTokens: 1200,
          temperature: 0.35,
          timeoutMs: 22_000,
          maxAttempts: 3,
        }
      );

      console.info("Career risk AI meta", {
        provider: meta.provider,
        model: meta.model,
        success: meta.success,
        error: meta.error,
        attempt: meta.attempt,
        latencyMs: meta.latencyMs,
      });

      if (text) {
        result = parseRiskJson(text, jobTitle);
      }
    } catch (aiErr) {
      console.error("Career risk AI call failed:", aiErr);
      result = null;
    }

    // If AI failed after we reserved, release the reservation
    if (!result && reservedEventId && reservedUserId) {
      try {
        await releaseUsageEventById(db, {
          userId: reservedUserId,
          usageEventId: reservedEventId,
        });
      } catch (releaseErr) {
        console.error("Release unused AI quota failed:", releaseErr);
      }
      reservedEventId = null;
    }

    // Offline only if AI truly failed
    if (!result) {
      result = heuristicCareerRisk(jobTitle, skills, {
        industry,
        experienceYears,
        country,
        location,
        education,
        locale,
      });
    }

    result = {
      ...result,
      jobTitle,
      riskLevel: scoreToRiskLevel(result.riskScore),
    };

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
      console.error("Career risk save failed:", saveErr);
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
        await releaseUsageEventById(db, {
          userId: reservedUserId,
          usageEventId: reservedEventId,
        });
      } catch {
        /* ignore */
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
