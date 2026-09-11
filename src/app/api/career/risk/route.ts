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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    try {
      const limit = await aiRatelimit.limit(
        `career_risk_list_${session.user.id}_${ip}`
      );
      if (!limit.success) {
        return rateLimitedResponse(limit, "Too many requests");
      }
    } catch (rlErr) {
      console.error("Career risk list rate limit error:", rlErr);
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
    try {
      const limit = await aiRatelimit.limit(
        `career_risk_${session.user.id}_${ip}`
      );
      if (!limit.success) {
        return rateLimitedResponse(limit, "Too many requests. Please wait.");
      }
    } catch (rlErr) {
      console.error("Career risk rate limit error (continuing):", rlErr);
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
      1500
    );
    const experienceYears = parsed.data.experienceYears;
    const industry = neutralizeInstructionish(parsed.data.industry || "").slice(
      0,
      120
    );
    const country = neutralizeInstructionish(parsed.data.country || "").slice(
      0,
      120
    );
    const location = neutralizeInstructionish(parsed.data.location || "").slice(
      0,
      200
    );
    const education = neutralizeInstructionish(
      parsed.data.education || ""
    ).slice(0, 200);
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
      console.error(
        "Career risk quota reserve failed (continuing without hard block):",
        quotaErr
      );
    }

    const systemPrompt = `You are a careful career-risk analyst for the next 5–10 years.

CRITICAL LANGUAGE RULE:
- Write summary, reasons, skillsToBuild, alternatives, and industryOutlook ENTIRELY in ${languageName}.
- Do NOT mix English into those fields unless the language is English.
- Keep JSON keys in English exactly as specified.

Reply with ONLY valid JSON (no markdown fences, no commentary):
{
  "jobTitle": "string",
  "riskScore": 0-100,
  "riskLevel": "low" | "medium" | "high",
  "summary": "2-4 sentences, balanced, no absolute claims about unemployment",
  "reasons": ["up to 6 concrete reasons"],
  "skillsToBuild": ["up to 8 skills"],
  "alternatives": ["up to 6 alternative or complementary roles"],
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
Scoring guide:
- taskAutomation: share of core tasks AI could do end-to-end at high reliability today
- toolMaturity: maturity of tools targeting those tasks
- marketAdoption: how widely employers already use such tools
- agenticExposure: exposure to autonomous multi-step agents
riskScore must be consistent with subScores. Prefer nuanced, role-specific advice.
Do not invent credentials the user did not provide.
If the job title is medical/clinical (e.g. physiotherapist, physician, nurse), emphasize hands-on care, regulation, and patient interaction.`;

    const userPrompt = `Response language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}
Country: ${country || "n/a"}
Location: ${location || "n/a"}
Education: ${education || "n/a"}`;

    let result = null as ReturnType<typeof heuristicCareerRisk> | null;

    try {
      const { text: aiText, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1100, temperature: 0.35, timeoutMs: 25_000 }
      );
      result = aiText ? parseRiskJson(aiText, jobTitle) : null;
      if (result) {
        console.info("Career risk AI ok", {
          provider: meta.provider,
          model: meta.model,
          latencyMs: meta.latencyMs,
          locale,
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
      result = heuristicCareerRisk(jobTitle, skills || undefined, {
        industry: industry || undefined,
        experienceYears:
          typeof experienceYears === "number" ? experienceYears : undefined,
        country: country || undefined,
        locale,
      });
    }

    result = {
      ...result,
      jobTitle,
      riskScore: result.riskScore,
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

    try {
      const fallbackTitle =
        typeof (error as { message?: string })?.message === "string"
          ? "Career role"
          : "Career role";
      const heuristic = heuristicCareerRisk(fallbackTitle, undefined, {
        locale: "en",
      });
      return NextResponse.json(
        toSuccessResponse({
          analysis: heuristic,
          paid: false,
          locale: "en",
        })
      );
    } catch {
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
}
