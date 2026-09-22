import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { chatCompletionWithMeta } from "@/lib/ai";
import { buildResume } from "@/lib/resume/writer";
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
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildResumePrompts,
  isWeakResumeOutput,
  looksHallucinated,
  normalizeTone,
  scrubResumeText,
} from "@/lib/resume-ai";

/* ------------------------------------------------------------------ */
/* ثابت‌ها                                                             */
/* ------------------------------------------------------------------ */

/** محدودیت طول ورودی‌ها برای کنترل هزینه و جلوگیری از سوءاستفاده. */
const MAX_FULL_NAME = 120;
const MAX_EMAIL = 200;
const MAX_PHONE = 40;
const MAX_LOCATION = 120;
const MAX_TARGET_ROLE = 120;
const MAX_SUMMARY = 2_000;
const MAX_EXPERIENCE = 8_000;
const MAX_EDUCATION = 4_000;
const MAX_SKILLS = 2_000;
const MAX_LANGUAGES = 500;

/** پارامترهای فراخوانی مدل AI. */
const AI_MAX_TOKENS = 1_800;
const AI_TEMPERATURE = 0.35;
const AI_TIMEOUT_MS = 18_000;
const AI_MAX_ATTEMPTS = 2;

/** نوع مصرف برای سیستم سهمیه. */
const QUOTA_KIND = "ai_resume";

/** پیشوند کلید Rate Limit. */
const RATELIMIT_PREFIX = "resume_gen";

/* ------------------------------------------------------------------ */
/* اسکیمای اعتبارسنجی                                                  */
/* ------------------------------------------------------------------ */

/**
 * یک فیلد رشته‌ای اختیاری که پس از trim شدن، حداکثر طول مشخصی دارد.
 * اگر مقدار `undefined` یا رشته‌ی خالی باشد، به رشته‌ی خالی تبدیل می‌شود.
 */
const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => v ?? "");

const schema = z.object({
  fullName: z.string().min(2).max(MAX_FULL_NAME),
  email: z
    .union([z.string().email().max(MAX_EMAIL), z.literal("")])
    .optional()
    .transform((v) => v ?? ""),
  phone: optionalTrimmed(MAX_PHONE),
  location: optionalTrimmed(MAX_LOCATION),
  targetRole: optionalTrimmed(MAX_TARGET_ROLE),
  summary: optionalTrimmed(MAX_SUMMARY),
  experience: optionalTrimmed(MAX_EXPERIENCE),
  education: optionalTrimmed(MAX_EDUCATION),
  skills: optionalTrimmed(MAX_SKILLS),
  languages: optionalTrimmed(MAX_LANGUAGES),
  tone: z
    .enum(["professional", "confident", "concise"])
    .optional()
    .default("professional"),
  locale: z
    .enum(["en", "fa", "ar", "es", "fr", "de", "hi"])
    .optional()
    .default("en"),
  saveToProfile: z.boolean().optional().default(false),
});

/* ------------------------------------------------------------------ */
/* توابع کمکی                                                          */
/* ------------------------------------------------------------------ */

/** پاسخ ۵۰۳ برای خطاهای زیرساختی (مثلاً Rate Limit از کار افتاده). */
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
 * نرمال‌سازی و پاک‌سازی payload درخواست برای استفاده‌ی downstream.
 * همه‌ی فیلدهای رشته‌ای با `neutralizeInstructionish` پاک‌سازی و
 * به محدودیت طول مربوطه بریده می‌شوند.
 */
function sanitizePayload(input: z.infer<typeof schema>): {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  tone: ReturnType<typeof normalizeTone>;
  locale: ReturnType<typeof normalizeCareerLocale>;
  saveToProfile: boolean;
} {
  return {
    fullName: neutralizeInstructionish(input.fullName).slice(0, MAX_FULL_NAME),
    email: input.email || "",
    phone: neutralizeInstructionish(input.phone || "").slice(0, MAX_PHONE),
    location: neutralizeInstructionish(input.location || "").slice(
      0,
      MAX_LOCATION,
    ),
    targetRole: neutralizeInstructionish(input.targetRole || "").slice(
      0,
      MAX_TARGET_ROLE,
    ),
    summary: neutralizeInstructionish(input.summary || "").slice(
      0,
      MAX_SUMMARY,
    ),
    experience: neutralizeInstructionish(input.experience || "").slice(
      0,
      MAX_EXPERIENCE,
    ),
    education: neutralizeInstructionish(input.education || "").slice(
      0,
      MAX_EDUCATION,
    ),
    skills: neutralizeInstructionish(input.skills || "").slice(0, MAX_SKILLS),
    languages: neutralizeInstructionish(input.languages || "").slice(
      0,
      MAX_LANGUAGES,
    ),
    tone: normalizeTone(input.tone),
    locale: normalizeCareerLocale(input.locale),
    saveToProfile: Boolean(input.saveToProfile),
  };
}

/* ------------------------------------------------------------------ */
/* POST — تولید رزومه                                                  */
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
    const userId = session.user.id;

    /* -------- Rate limit (سخت‌گیرانه) -------- */
    const ip = getRequestIp(req);
    const limit = await strictAiLimit(
      aiRatelimit,
      `${RATELIMIT_PREFIX}_${userId}_${ip}`,
    );
    if (limit.infraFailed) {
      return infraUnavailable(
        "RATE_LIMIT_INFRA_ERROR",
        "Service temporarily unavailable. Please try again shortly.",
      );
    }
    if (!limit.success) {
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = sanitizePayload(parsed.data);
    const locale = data.locale;

    /* -------- پلن -------- */
    let effectivePlan = "free";
    try {
      const effective = await getEffectivePlan(userId, {
        persistDowngrade: true,
      });
      effectivePlan = effective.plan;
    } catch (planErr) {
      // در صورت خطا، به پلن پیش‌فرض free برمی‌گردیم.
      console.error("Resume getEffectivePlan failed:", planErr);
    }

    /* -------- رزرو سهمیه -------- */
    // حالت‌های ممکن:
    // A) رزرو موفق → مجاز به فراخوانی AI
    // B) سهمیه تمام → پاسخ ۴۰۳ (بدون fallback، چون این endpoint مبتنی بر AI است)
    // C) خطای زیرساختی → سرویس با قالب (template) و بدون AI پاسخ می‌دهد
    let allowAi = false;
    try {
      const reserveResult = await reserveAiUsageInTransaction(db, {
        userId,
        plan: effectivePlan,
        kind: QUOTA_KIND,
        meta: data.targetRole || data.fullName,
      });

      if (!reserveResult.ok) {
        return NextResponse.json(
          {
            error: reserveResult.error,
            code: reserveResult.code,
            limit: reserveResult.limit,
            used: reserveResult.used,
          },
          { status: 403 },
        );
      }

      reservedEventId = reserveResult.usageEventId ?? null;
      reservedUserId = userId;
      allowAi = true;
    } catch (quotaErr) {
      // قفل/تراکنش تایم‌اوت شده: بدون AI و بدون هزینه، قالب را برگردان.
      logQuotaInfraError("resume_reserve", quotaErr);
      allowAi = false;
      reservedEventId = null;
      reservedUserId = null;
    }

    /* -------- تلاش برای فراخوانی AI -------- */
    // System prompt + user prompt هر دو locale-aware هستند. System
    // prompt از همان section headings استفاده می‌کند که offline
    // writer استفاده می‌کند (single source of truth).
    const { system: systemPrompt, user: userPrompt } = buildResumePrompts(
      data.tone,
      data,
      locale,
    );

    let text: string | null = null;
    let source: "ai" | "template" = "template";

    try {
      if (!allowAi) {
        // در صورت رد سهمیه‌ی زیرساختی، از فراخوانی AI صرف‌نظر می‌کنیم.
        throw new Error("quota_infra_skip_ai");
      }

      const { text: aiText, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          maxTokens: AI_MAX_TOKENS,
          temperature: AI_TEMPERATURE,
          timeoutMs: AI_TIMEOUT_MS,
          maxAttempts: AI_MAX_ATTEMPTS,
        },
      );

      if (aiText) {
        const scrubbed = scrubResumeText(aiText);

        // فقط اگر خروجی ضعیف یا توهم‌آمیز نباشد، آن را می‌پذیریم.
        // هر دو validator حالا locale-aware هستند: برای fa/ar/hi طول
        // کمتری لازم است و script چک می‌شود.
        if (
          !isWeakResumeOutput(scrubbed, locale) &&
          !looksHallucinated(scrubbed, data, locale)
        ) {
          text = scrubbed;
          source = "ai";
          console.info("Resume AI ok", {
            provider: meta.provider,
            model: meta.model,
            latencyMs: meta.latencyMs,
            locale,
          });
        } else {
          console.error("Resume AI rejected (weak/hallucination)", {
            provider: meta.provider,
            model: meta.model,
            locale,
          });
        }
      }
    } catch (aiErr) {
      console.error("Resume AI failed:", aiErr);
      text = null;
    }

    /* -------- Fallback به قالب + آزادسازی سهمیه -------- */
    if (!text) {
      // AI نتیجه نداد → سهمیه‌ی رزروشده را آزاد کن و از قالب استفاده کن.
      await safeReleaseUsage(reservedUserId, reservedEventId);
      reservedEventId = null;

      // از `buildResume` مستقیم استفاده می‌کنیم تا locale-aware
      // fallback کامل شود. wrapper `buildTemplateResume` را دور می‌زنیم.
      text = buildResume({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        targetRole: data.targetRole,
        summary: data.summary,
        experience: data.experience,
        education: data.education,
        skills: data.skills,
        languages: data.languages,
        tone: data.tone,
        locale,
      }).text;
      source = "template";
    }

    /* -------- ذخیره‌ی اختیاری در پروفایل -------- */
    let profileSaved = false;
    if (data.saveToProfile) {
      try {
        const profileData = {
          bio: data.summary || null,
          skills: data.skills || data.targetRole || null,
          experience: data.experience || null,
          education: data.education || null,
          phone: data.phone || null,
          location: data.location || null,
        };

        // ایجاد یا به‌روزرسانی پروفایل کاربر.
        await db.profile.upsert({
          where: { userId },
          create: { userId, ...profileData },
          update: profileData,
        });

        // به‌روزرسانی نام کاربر در صورت وجود.
        if (data.fullName) {
          await db.user.update({
            where: { id: userId },
            data: { name: data.fullName },
          });
        }
        profileSaved = true;
      } catch (saveErr) {
        // خطای ذخیره‌سازی مانع بازگشت رزومه نمی‌شود.
        console.error("Resume saveToProfile failed:", saveErr);
      }
    }

    /* -------- پاسخ موفق -------- */
    return NextResponse.json({
      success: true,
      resume: text,
      source,
      locale,
      profileSaved,
      message: profileSaved
        ? "Resume ready. Profile notes updated."
        : "Resume ready.",
    });
  } catch (error) {
    console.error("Resume generate error:", error);

    // تلاش برای آزادسازی سهمیه در صورت خطای پیش‌بینی‌نشده.
    await safeReleaseUsage(reservedUserId, reservedEventId);

    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 },
    );
  }
}
