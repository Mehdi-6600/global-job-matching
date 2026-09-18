import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { chatCompletionWithMeta } from "@/lib/ai";
import {
  languageNameForPrompt,
  normalizeCareerLocale,
} from "@/lib/career-risk";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import {
  reserveAiUsageInTransaction,
  releaseUsageInTransaction,
  logQuotaInfraError,
} from "@/lib/quota";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { neutralizeInstructionish } from "@/lib/ai-sanitize";
import { strictAiLimit } from "@/lib/safe-ratelimit";
import { buildOfflineRoadmap } from "@/lib/career-intelligence/offline-roadmap";

/* ------------------------------------------------------------------ */
/* اسکیمای اعتبارسنجی ورودی                                          */
/* ------------------------------------------------------------------ */

const bodySchema = z.object({
  jobTitle: z.string().trim().min(2).max(120),
  skillsToBuild: z.array(z.string().max(200)).max(12).optional().default([]),
  reasons: z.array(z.string().max(400)).max(10).optional().default([]),
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  summary: z.string().max(2500).optional(),
  country: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  skills: z.string().max(1500).optional(),
  industry: z.string().max(120).optional(),
  education: z.string().max(200).optional(),
  targetRole: z.string().max(120).optional(),
  careerGoal: z.string().max(200).optional(),
  locale: z
    .enum(["en", "fa", "ar", "es", "fr", "hi", "de"])
    .optional()
    .default("en"),
});

/* ------------------------------------------------------------------ */
/* انواع داده                                                        */
/* ------------------------------------------------------------------ */

/** یک بلوک هفتگی در نقشه‌ی راه. */
type WeekPlan = {
  week: string;
  focus: string;
  actions: string[];
};

/** نتیجه‌ی نهایی نقشه‌ی راه. */
type RoadmapResult = {
  title: string;
  weeks: WeekPlan[];
  resources: string[];
  source: "ai" | "heuristic";
};

/* ------------------------------------------------------------------ */
/* پارس خروجی AI                                                     */
/* ------------------------------------------------------------------ */

/**
 * پارس خروجی JSON مدل AI برای نقشه‌ی راه.
 *
 * استراتژی:
 * 1) حذف بلوک‌های ```json ... ```
 * 2) استخراج اولین { ... } معتبر
 * 3) اعتبارسنجی: حداقل ۲ بلوک هفتگی معتبر مورد نیاز است
 */
function parseRoadmapJson(
  text: string,
  jobTitle: string
): RoadmapResult | null {
  if (!text || typeof text !== "string") return null;

  let jsonStr = text.trim();

  // حذف بلوک‌های ```json ... ```
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();

  // استخراج اولین { ... } معتبر
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(jsonStr.slice(start, end + 1)) as {
      title?: string;
      weeks?: Array<{ week?: string; focus?: string; actions?: string[] }>;
      resources?: string[];
    };

    /* -------- نرمال‌سازی بلوک‌های هفتگی -------- */
    const weeks: WeekPlan[] = (raw.weeks || [])
      .map((w) => ({
        week: String(w.week || "").trim().slice(0, 80),
        focus: String(w.focus || "").trim().slice(0, 120),
        actions: (w.actions || [])
          .map((a) => String(a ?? "").trim())
          .filter(Boolean)
          .slice(0, 6),
      }))
      .filter((w) => w.week && w.actions.length > 0)
      .slice(0, 6);

    // حداقل ۲ بلوک هفتگی معتبر مورد نیاز است.
    if (weeks.length < 2) return null;

    return {
      title: String(raw.title || `90-day roadmap for ${jobTitle}`)
        .trim()
        .slice(0, 200),
      weeks,
      resources: (raw.resources || [])
        .map((r) => String(r ?? "").trim())
        .filter(Boolean)
        .slice(0, 8),
      source: "ai",
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* POST — تولید نقشه‌ی راه                                            */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  /** شناسه‌ی رویداد مصرف رزروشده (برای آزادسازی در صورت خطا). */
  let reservedEventId: string | null = null;
  /** شناسه‌ی کاربری که سهمیه برایش رزرو شده است. */
  let reservedUserId: string | null = null;

  try {
    /* -------- احراز هویت -------- */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------- Rate limit (سخت‌گیرانه، اما Fail-Soft) -------- */
    const ip = getRequestIp(req);
    const limit = await strictAiLimit(
      aiRatelimit,
      `career_roadmap_${session.user.id}_${ip}`
    );

    if (limit.infraFailed) {
      // پس از fallback حافظه، این حالت نادر است. ۵۰۳ نکن —
      // سهمیه + heuristic همچنان از محصول محافظت می‌کنند.
      console.warn("[career/roadmap] rate limit infra degraded; continuing");
    } else if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    /* -------- خواندن بدنه‌ی درخواست -------- */
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    /* -------- اعتبارسنجی ورودی -------- */
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    /* -------- پاک‌سازی ورودی‌ها -------- */
    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      120
    );
    const skillsToBuild = parsed.data.skillsToBuild
      .map((s) => neutralizeInstructionish(s).slice(0, 200))
      .filter(Boolean);

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

    let plan = String(user.plan || "free").toLowerCase();
    try {
      const effective = await getEffectivePlan(user.id);
      plan = effective.plan;
    } catch {
      // در صورت خطا، پلن پیش‌فرض کاربر را نگه می‌داریم.
    }

    /* -------- رزرو سهمیه -------- */
    // سه حالت ممکن:
    // A) رزرو موفق → مجاز به فراخوانی AI
    // B) سهمیه تمام → فقط heuristic، بدون AI و بدون هزینه
    // C) خطای زیرساختی → فقط heuristic، بدون AI (محصول ۵۰۳ نمی‌شود)
    let allowAi = false;
    try {
      const quota = await reserveAiUsageInTransaction(db, {
        userId: user.id,
        plan,
        kind: "ai_roadmap",
        meta: `roadmap:${jobTitle}`,
      });

      if (!quota.ok) {
        // محدودیت تجاری — هنوز نقشه‌ی راه heuristic برگردان (بدون هزینه).
        allowAi = false;
        console.warn("Roadmap quota exceeded; heuristic only", {
          code: quota.code,
        });
      } else {
        allowAi = true;
        reservedEventId = quota.usageEventId ?? null;
        reservedUserId = user.id;
      }
    } catch (err) {
      // خطای DB پس از تلاش مجدد — کل محصول را ۵۰۳ نکن.
      logQuotaInfraError("roadmap_reserve", err);
      allowAi = false;
      reservedEventId = null;
      reservedUserId = null;
    }

    /* -------- ساخت پرامپت‌ها -------- */
    const systemPrompt = `You are a practical career coach.
Write ALL human-readable text ENTIRELY in ${languageName} (not English unless language is English).
Every week title, focus, action and resource must be in ${languageName}.
Return ONLY JSON:
{
  "title": "string",
  "weeks": [
    { "week": "Weeks 1–3", "focus": "string", "actions": ["string", "string"] }
  ],
  "resources": ["string"]
}
Provide 4 blocks covering ~90 days. Be specific to the job title, location, and skills.`;

    const userPrompt = `Job: ${jobTitle}
Risk: ${parsed.data.riskLevel ?? "n/a"} (${parsed.data.riskScore ?? "n/a"})
Summary: ${parsed.data.summary || "n/a"}
Skills to build: ${skillsToBuild.join(", ") || "n/a"}
Reasons: ${(parsed.data.reasons || []).join(" | ") || "n/a"}
Country: ${parsed.data.country || "n/a"}
City: ${parsed.data.location || "n/a"}
Experience years: ${parsed.data.experienceYears ?? "n/a"}
CRITICAL: Reply language = ${languageName} only.
Language: ${languageName}`;

    /* -------- تلاش برای فراخوانی AI -------- */
    let result: RoadmapResult | null = null;

    if (allowAi) {
      try {
        const { text } = await chatCompletionWithMeta(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            maxTokens: 1400,
            temperature: 0.4,
            timeoutMs: 22_000,
            maxAttempts: 3,
          }
        );

        if (text) {
          const parsedAi = parseRoadmapJson(text, jobTitle);
          if (parsedAi) result = parsedAi;
        }
      } catch (err) {
        console.error("Roadmap AI failed:", err);
      }
    }

    /* -------- Fallback به heuristic + آزادسازی سهمیه -------- */
    if (!result) {
      // AI نتیجه نداد → سهمیه را آزاد کن و از heuristic استفاده کن.
      if (reservedEventId && reservedUserId) {
        try {
          await releaseUsageInTransaction(db, {
            userId: reservedUserId,
            usageEventId: reservedEventId,
          });
        } catch {
          // خطای آزادسازی مانع بازگشت پاسخ نمی‌شود.
        }
        reservedEventId = null;
        reservedUserId = null;
      }

      result = buildOfflineRoadmap({
        jobTitle,
        skills: parsed.data.skills || skillsToBuild.join(", "),
        skillsToBuild,
        country: parsed.data.country,
        location: parsed.data.location,
        experienceYears: parsed.data.experienceYears,
        industry: parsed.data.industry,
        education: parsed.data.education,
        targetRole: parsed.data.targetRole,
        careerGoal: parsed.data.careerGoal,
        locale,
      });
    }

    /* -------- پاسخ موفق -------- */
    return NextResponse.json(result);
  } catch (error) {
    console.error("Roadmap error:", error);

    // تلاش برای آزادسازی سهمیه در صورت خطای پیش‌بینی‌نشده.
    if (reservedEventId && reservedUserId) {
      try {
        await releaseUsageInTransaction(db, {
          userId: reservedUserId,
          usageEventId: reservedEventId,
        });
      } catch {
        // خطای آزادسازی مانع بازگشت پاسخ نمی‌شود.
      }
    }

    return NextResponse.json(
      { error: "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}
