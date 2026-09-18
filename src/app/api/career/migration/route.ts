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
import { buildOfflineMigration } from "@/lib/career-intelligence/offline-migration";

/* ------------------------------------------------------------------ */
/* اسکیمای اعتبارسنجی ورودی                                          */
/* ------------------------------------------------------------------ */

const bodySchema = z.object({
  jobTitle: z.string().trim().min(2).max(120),
  skills: z.string().max(1500).optional(),
  skillsToBuild: z.array(z.string().max(200)).max(12).optional().default([]),
  industry: z.string().max(120).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  country: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  education: z.string().max(200).optional(),
  targetRole: z.string().max(120).optional(),
  careerGoal: z.string().max(200).optional(),
  languages: z.string().max(300).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  locale: z
    .enum(["en", "fa", "ar", "es", "fr", "hi", "de"])
    .optional()
    .default("en"),
});

/* ------------------------------------------------------------------ */
/* انواع داده                                                        */
/* ------------------------------------------------------------------ */

/** یک کشور مقصد در تحلیل مهاجرت. */
type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

/** نتیجه‌ی نهایی تحلیل مهاجرت. */
type MigrationResult = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  caveats: string[];
  source: "ai" | "heuristic";
};

/* ------------------------------------------------------------------ */
/* پارس خروجی AI                                                     */
/* ------------------------------------------------------------------ */

/**
 * پارس خروجی JSON مدل AI برای تحلیل مهاجرت.
 *
 * استراتژی:
 * 1) حذف بلوک‌های ```json ... ```
 * 2) استخراج اولین { ... } معتبر
 * 3) اعتبارسنجی: حداقل ۲ کشور معتبر مورد نیاز است
 */
function parseMigrationJson(
  text: string,
  jobTitle: string
): MigrationResult | null {
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
      summary?: string;
      countries?: Array<{
        country?: string;
        demand?: string;
        pathway?: string;
        notes?: string;
      }>;
      caveats?: string[];
    };

    /* -------- نرمال‌سازی کشورها -------- */
    const countries: MigrationCountry[] = (raw.countries || [])
      .map((c) => ({
        country: String(c.country || "").trim().slice(0, 120),
        demand: String(c.demand || "").trim().slice(0, 500),
        pathway: String(c.pathway || "").trim().slice(0, 500),
        notes: String(c.notes || "").trim().slice(0, 500),
      }))
      .filter((c) => c.country && (c.demand || c.pathway))
      .slice(0, 8);

    // حداقل ۲ کشور معتبر مورد نیاز است.
    if (countries.length < 2) return null;

    return {
      title: String(
        raw.title || `Skill-based migration options for ${jobTitle}`
      )
        .trim()
        .slice(0, 200),
      summary: String(raw.summary || "").trim().slice(0, 1200),
      countries,
      caveats: (raw.caveats || [])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .slice(0, 8),
      source: "ai",
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* POST — تحلیل گزینه‌های مهاجرت                                      */
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
      `career_migration_${session.user.id}_${ip}`
    );

    if (limit.infraFailed) {
      // پس از fallback حافظه، این حالت نادر است. ۵۰۳ نکن —
      // سهمیه + heuristic همچنان از محصول محافظت می‌کنند.
      console.warn(
        "[career/migration] rate limit infra degraded; continuing"
      );
    } else if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests. Please wait.");
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
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    /* -------- پاک‌سازی ورودی‌ها -------- */
    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      120
    );
    const skills = neutralizeInstructionish(parsed.data.skills || "").slice(
      0,
      1500
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
        kind: "ai_migration",
        meta: `migration:${jobTitle}`,
      });

      if (!quota.ok) {
        // محدودیت تجاری — هنوز تحلیل heuristic برگردان (بدون هزینه).
        allowAi = false;
        console.warn("Migration quota exceeded; heuristic only", {
          code: quota.code,
        });
      } else {
        allowAi = true;
        reservedEventId = quota.usageEventId ?? null;
        reservedUserId = user.id;
      }
    } catch (err) {
      // خطای DB پس از تلاش مجدد — کل محصول را ۵۰۳ نکن.
      logQuotaInfraError("migration_reserve", err);
      allowAi = false;
      reservedEventId = null;
      reservedUserId = null;
    }

    /* -------- ساخت پرامپت‌ها -------- */
    const systemPrompt = `You are a careful international labor-mobility analyst.
Write ALL human-readable fields ENTIRELY in ${languageName} (not English unless language is English).
JSON keys stay in English.
If the user locale is Persian/Arabic/Hindi/etc., every sentence in title/summary/demand/pathway/notes/caveats MUST be in that language.

Rules:
- Focus on skill demand and realistic pathways for THIS job title.
- Consider origin country constraints in general terms (passport strength, common sanction/banking friction) WITHOUT political slogans.
- Never promise visas or guaranteed acceptance.
- Prefer 4–6 concrete destination countries/regions with demand + pathway + practical notes.
- Always include caveats that this is not legal advice.

Return ONLY JSON:
{
  "title": "string",
  "summary": "2-4 sentences",
  "countries": [
    { "country": "string", "demand": "string", "pathway": "string", "notes": "string" }
  ],
  "caveats": ["string"]
}`;

    const userPrompt = `CRITICAL: Reply language = ${languageName} only.
Language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Skills to build: ${(parsed.data.skillsToBuild || []).join(", ") || "n/a"}
Industry: ${industry || "n/a"}
Experience years: ${experienceYears ?? "n/a"}
Origin country: ${country || "n/a"}
City: ${location || "n/a"}
Education: ${education || "n/a"}
Automation risk level: ${parsed.data.riskLevel ?? "n/a"}`;

    /* -------- تلاش برای فراخوانی AI -------- */
    let result: MigrationResult | null = null;

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
          result = parseMigrationJson(text, jobTitle);
        }
      } catch (err) {
        console.error("Migration AI failed:", err);
      }

      // اگر AI نتیجه نداد → سهمیه را آزاد کن.
      if (!result && reservedEventId && reservedUserId) {
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
    }

    /* -------- Fallback به heuristic -------- */
    if (!result) {
      result = buildOfflineMigration({
        jobTitle,
        skills: skills || undefined,
        industry: industry || undefined,
        experienceYears,
        country: country || undefined,
        location: location || undefined,
        education: education || undefined,
        targetRole: parsed.data.targetRole,
        careerGoal: parsed.data.careerGoal,
        languages: parsed.data.languages,
        locale,
      });
    }

    /* -------- پاسخ موفق -------- */
    return NextResponse.json(result);
  } catch (error) {
    console.error("Migration error:", error);

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
      { error: "Failed to analyze migration options" },
      { status: 500 }
    );
  }
}
