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
  reserveAiUsageInTransaction,
  releaseUsageInTransaction,
  logQuotaInfraError,
} from "@/lib/quota";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { neutralizeInstructionish } from "@/lib/ai-sanitize";
import { safeLimit, strictAiLimit } from "@/lib/safe-ratelimit";

/* ------------------------------------------------------------------ */
/* ثابت‌ها                                                             */
/* ------------------------------------------------------------------ */

/** حداکثر تعداد ارزیابی‌های بازگشتی در لیست. */
const LIST_LIMIT = 20;

/** تعداد بایت‌های تصادفی برای ساخت توکن اشتراک‌گذاری. */
const SHARE_TOKEN_BYTES = 18;

/** محدودیت طول ورودی‌ها برای جلوگیری از سوءاستفاده و کنترل هزینه. */
const MAX_JOB_TITLE = 120;
const MAX_SKILLS = 2_000;
const MAX_INDUSTRY = 120;
const MAX_COUNTRY = 120;
const MAX_LOCATION = 200;
const MAX_EDUCATION = 200;

/** پارامترهای فراخوانی مدل AI. */
const AI_MAX_TOKENS = 1_600;
const AI_TEMPERATURE = 0.35;
const AI_TIMEOUT_MS = 18_000;
const AI_MAX_ATTEMPTS = 2;

/** نوع مصرف برای سیستم سهمیه. */
const QUOTA_KIND = "ai_career_risk";

/* ------------------------------------------------------------------ */
/* توابع کمکی                                                          */
/* ------------------------------------------------------------------ */

/** پاسخ ۵۰۳ برای خطاهای زیرساختی. */
function infraUnavailable(code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status: 503 });
}

/** پاسخ ۴۰۱ برای کاربر احراز هویت‌نشده. */
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * آزادسازی یک رویداد مصرف رزروشده.
 * اگر مقادیر null باشند، هیچ کاری انجام نمی‌دهد.
 * خطاها فقط لاگ می‌شوند و هرگز پرتاب نمی‌شوند.
 */
async function safeReleaseUsage(
  userId: string | null,
  eventId: string | null,
): Promise<void> {
  if (!userId || !eventId) return;
  await releaseUsageInTransaction(db, {
    userId,
    usageEventId: eventId,
  });
}

/**
 * ساخت جفت پرامپت system و user برای فراخوانی AI.
 */
function buildPrompts(input: {
  languageName: string;
  jobTitle: string;
  skills: string;
  industry: string;
  experienceYears: number | null | undefined;
  country: string;
  location: string;
  education: string;
}): { system: string; user: string } {
  const system = `You are a careful career-risk analyst for the next 5–10 years.

CRITICAL LANGUAGE RULE:
- Write summary, reasons, skillsToBuild, alternatives, and industryOutlook ENTIRELY in ${input.languageName}.
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

  const user = `Response language: ${input.languageName}
Job title: ${input.jobTitle}
Skills: ${input.skills || "n/a"}
Industry: ${input.industry || "n/a"}
Experience years: ${input.experienceYears ?? "n/a"}
Country: ${input.country || "n/a"}
City: ${input.location || "n/a"}
Education: ${input.education || "n/a"}`;

  return { system, user };
}

/* ------------------------------------------------------------------ */
/* GET — لیست ارزیابی‌های اخیر                                        */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    /* -------- احراز هویت -------- */
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    /* -------- Rate limit (سبک، fail-open) -------- */
    const ip = getRequestIp(req);
    // این endpoint ارزان است؛ در صورت خرابی زیرساخت Rate Limit،
    // به‌جای بلاک کردن کاربر، اجازه‌ی عبور می‌دهیم.
    const limit = await safeLimit(
      aiRatelimit,
      `career_risk_list_${session.user.id}_${ip}`,
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    /* -------- خواندن لیست -------- */
    try {
      const items = await db.careerRiskAssessment.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: LIST_LIMIT,
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
      // تخریب تدریجی: به‌جای ۵۰۰، لیست خالی برگردان.
      return NextResponse.json({ assessments: [] });
    }
  } catch (error) {
    console.error("Career risk GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/* POST — تحلیل ریسک شغلی                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  /** شناسه‌ی رویداد مصرف رزروشده (برای آزادسازی در صورت خطا). */
  let reservedEventId: string | null = null;
  /** شناسه‌ی کاربری که سهمیه برایش رزرو شده است. */
  let reservedUserId: string | null = null;

  try {
    /* -------- احراز هویت -------- */
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    /* -------- Rate limit (سخت‌گیرانه، اما Fail-Soft) -------- */
    const ip = getRequestIp(req);
    const limit = await strictAiLimit(
      aiRatelimit,
      `career_risk_${session.user.id}_${ip}`,
    );

    if (limit.infraFailed) {
      // پس از fallback حافظه، این حالت نادر است. ۵۰۳ نکن —
      // سهمیه + heuristic همچنان از محصول محافظت می‌کنند.
      console.warn(
        "[career/risk] rate limit infra degraded; continuing",
      );
    } else if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests. Please wait.");
    }

    /* -------- خواندن بدنه‌ی درخواست -------- */
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    /* -------- اعتبارسنجی ورودی -------- */
    const parsed = careerRiskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    /* -------- پاک‌سازی ورودی‌ها -------- */
    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      MAX_JOB_TITLE,
    );
    const skills = neutralizeInstructionish(parsed.data.skills || "").slice(
      0,
      MAX_SKILLS,
    );
    const industry = neutralizeInstructionish(
      parsed.data.industry || "",
    ).slice(0, MAX_INDUSTRY);
    const country = neutralizeInstructionish(parsed.data.country || "").slice(
      0,
      MAX_COUNTRY,
    );
    const location = neutralizeInstructionish(
      parsed.data.location || "",
    ).slice(0, MAX_LOCATION);
    const education = neutralizeInstructionish(
      parsed.data.education || "",
    ).slice(0, MAX_EDUCATION);
    const experienceYears = parsed.data.experienceYears;

    const locale = normalizeCareerLocale(parsed.data.locale);
    const languageName = languageNameForPrompt(locale);

    /* -------- کاربر و پلن -------- */
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
      // در صورت خطا در تعیین پلن، به پلن پیش‌فرض کاربر برمی‌گردیم.
      console.error("getEffectivePlan failed, using free:", planErr);
      effectivePlan = String(user.plan || "free").toLowerCase();
    }
    const paid = isPaidPlan(effectivePlan);

    /* -------- رزرو سهمیه -------- */
    // سه حالت ممکن:
    // A) رزرو موفق → مجاز به فراخوانی AI
    // B) سهمیه تمام → فقط heuristic، بدون AI
    // C) خطای زیرساختی → فقط heuristic، بدون AI (محصول ۵۰۳ نمی‌شود)
    let allowAi = false;
    try {
      const reserveResult = await reserveAiUsageInTransaction(db, {
        userId: user.id,
        plan: effectivePlan,
        kind: QUOTA_KIND,
        meta: jobTitle,
      });

      if (!reserveResult.ok) {
        // محدودیت تجاری — هنوز تحلیل heuristic برگردان (بدون AI، بدون هزینه).
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
      // خطای DB پس از تلاش مجدد — کل محصول را ۵۰۳ نکن.
      // heuristic نیازی به سهمیه‌ی AI ندارد؛ فقط AI را برای این درخواست رد کن.
      logQuotaInfraError("career_risk_reserve", quotaErr);
      allowAi = false;
      reservedEventId = null;
      reservedUserId = null;
    }

    /* -------- تلاش برای فراخوانی AI -------- */
    let result: ReturnType<typeof heuristicCareerRisk> | null = null;

    if (allowAi) {
      const { system, user: userPrompt } = buildPrompts({
        languageName,
        jobTitle,
        skills,
        industry,
        experienceYears,
        country,
        location,
        education,
      });

      try {
        const { text } = await chatCompletionWithMeta(
          [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          {
            maxTokens: AI_MAX_TOKENS,
            temperature: AI_TEMPERATURE,
            timeoutMs: AI_TIMEOUT_MS,
            maxAttempts: AI_MAX_ATTEMPTS,
          },
        );

        if (text) {
          const parsedAi = parseRiskJson(text, jobTitle);
          if (parsedAi) result = parsedAi;
        }
      } catch (aiErr) {
        console.error("Career risk AI failed:", aiErr);
      }

      // اگر AI پس از رزرو شکست خورد → سهمیه را آزاد کن و از heuristic استفاده کن.
      if (!result) {
        await safeReleaseUsage(reservedUserId, reservedEventId);
        reservedEventId = null;
      }
    }

    /* -------- Fallback به heuristic -------- */
    if (!result) {
      result = heuristicCareerRisk(jobTitle, skills, {
        industry,
        experienceYears,
        country,
        location,
        education,
        locale,
        targetRole: targetRole || undefined,
        careerGoal: careerGoal || undefined,
        languages: languages || undefined,
      });
    }

    // اطمینان از اینکه عنوان شغلی همیشه بازتاب ورودی (پاک‌سازی‌شده) کاربر است.
    result = { ...result, jobTitle };

    /* -------- ذخیره‌سازی -------- */
    const shareToken = randomBytes(SHARE_TOKEN_BYTES).toString("hex");
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
          // جایگزین‌ها فقط برای کاربران پلن پرداختی ذخیره می‌شوند.
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
        saveErr,
      );
      // حتی اگر ذخیره‌سازی شکست خورد، تحلیل برای کاربر مفید است.
      savedShareToken = undefined;
      assessmentId = undefined;
    }

    /* -------- پاسخ موفق -------- */
    return NextResponse.json(
      toSuccessResponse({
        analysis: result,
        paid,
        assessmentId,
        shareToken: savedShareToken,
        locale,
      }),
    );
  } catch (error) {
    console.error("Career risk error:", error);

    // تلاش برای آزادسازی سهمیه در صورت خطای پیش‌بینی‌نشده.
    await safeReleaseUsage(reservedUserId, reservedEventId);

    return NextResponse.json(
      {
        error:
          "Failed to analyze career risk. Please try again in a moment.",
        code: "CAREER_RISK_INTERNAL",
      },
      { status: 500 },
    );
  }
}
