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
import { safeLimit, strictAiLimit } from "@/lib/safe-ratelimit";

function infraUnavailable(code: string, message: string) {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    { status: 503 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    // Cheap list endpoint: fail-open is acceptable for UX
    const limit = await safeLimit(
      aiRatelimit,
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
          sharePath: a.shareToken
            ? `/career-risk/share/${a.shareToken}`
            : undefined,
        })),
      });
    } catch (listErr) {
      console.error("Career risk list failed:", listErr);
      return NextResponse.json({ assessments: [] });
    }
  } catch (error) {
    console.error("Career risk GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let reservedEventId: string | null = null;
  let reservedUserId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await strictAiLimit(
      aiRatelimit,
      `career_risk_${session.user.id}_${ip}`
    );
    if (limit.infraFailed) {
      return infraUnavailable(
        "RATE_LIMIT_INFRA_ERROR",
        "Service temporarily unavailable. Please try again shortly."
      );
    }
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

    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      120
    );
    const skills = neutralizeInstructionish(parsed.data.skills || "").slice(
      0,
      2000
    );
    const industry = neutralizeInstructionish(
      parsed.data.industry || ""
    ).slice(0, 120);
    const country = neutralizeInstructionish(parsed.data.country || "").slice(
      0,
      120
    );
    const location = neutralizeInstructionish(
      parsed.data.location || ""
    ).slice(0, 200);
    const education = neutralizeInstructionish(
      parsed.data.education || ""
    ).slice(0, 200);
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

    // Quota states:
    // A) reserved → may call AI
    // B) exceeded → heuristic only, no AI
    // C) infra failure → 503, no AI
    let allowAi = false;
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
        allowAi = false;
        console.warn("Career risk quota exceeded; heuristic only", {
          code: reserveResult.code,
        });
      } else {
        allowAi = true;
        reservedEventId = reserveResult.usageEventId ?? null;
        reservedUserId = user.id;
      }
    } catch (quotaErr) {
      console.error("Career risk quota infra failure:", quotaErr);
      return infraUnavailable(
        "QUOTA_INFRA_ERROR",
        "Service temporarily unavailable. Please try again shortly."
      );
    }

    const systemPrompt = `You are a careful career-risk analyst for the next 5–10 years.

CRITICAL LANGUAGE RULE:
- Write summary, reasons, skillsToBuild, alternatives, and industryOutlook ENTIRELY in ${languageName}.
- JSON keys stay in English.
- Write 3–5 concrete reasons, not one vague sentence.
- Skills must be specific to THIS job title and location (not generic only).

Return ONLY valid JSON:
{
  "jobTitle": "string",
  "riskScore": 0-100,
  "riskLevel": "low|medium|high",
  "summary": "string",
  "reasons": ["string"],
  "skillsToBuild": ["string"],
  "alternatives": ["string"],
  "subScores": {
    "taskAutomation": 0-100,
    "toolMaturity": 0-100,
    "marketAdoption": 0-100,
    "agenticExposure": 0-100
  },
  "timeHorizon": "string",
  "confidence": 0-100,
  "industryOutlook": "string"
}
riskScore must be consistent with subScores. All subScores are required.`;

    const userPrompt = `Response language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Industry: ${industry || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Country: ${country || "n/a"}
City: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;

    if (allowAi) {
      try {
        const { text } = await chatCompletionWithMeta(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            maxTokens: 1600,
            temperature: 0.35,
            timeoutMs: 28_000,
            maxAttempts: 3,
          }
        );
        if (text) {
          const parsedAi = parseRiskJson(text, {
            jobTitle,
            locale,
            paid,
          });
          if (parsedAi) {
            result = parsedAi;
          }
        }
      } catch (aiErr) {
        console.error("Career risk AI failed:", aiErr);
      }

      // AI failed after reservation → release quota, use heuristic
      if (!result && reservedEventId && reservedUserId) {
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
    }

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
