import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiRatelimit } from "@/lib/ratelimit";
import { buildTemplateResume, chatCompletionWithMeta } from "@/lib/ai";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import {
  assertAndReserveAiUsage,
  lockUserRow,
  releaseUsageEventById,
} from "@/lib/quota";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { neutralizeInstructionish } from "@/lib/ai-sanitize";
import { strictAiLimit } from "@/lib/safe-ratelimit";
import {
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
  isWeakResumeOutput,
  looksHallucinated,
  normalizeTone,
  scrubResumeText,
} from "@/lib/resume-ai";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

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

const AI_MAX_TOKENS = 1_800;
const AI_TEMPERATURE = 0.35;
const AI_TIMEOUT_MS = 18_000;
const AI_MAX_ATTEMPTS = 2;

const QUOTA_KIND = "ai_resume";
const RATELIMIT_PREFIX = "resume_gen";

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

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
  saveToProfile: z.boolean().optional().default(false),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function infraUnavailable(code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status: 503 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Release a reserved AI usage event. Safe to call with null values.
 * Errors are logged but never thrown.
 */
async function safeReleaseUsage(
  userId: string | null,
  eventId: string | null,
): Promise<void> {
  if (!userId || !eventId) return;
  try {
    await db.$transaction(async (tx) => {
      await releaseUsageEventById(tx, {
        userId,
        usageEventId: eventId,
      });
    });
  } catch (err) {
    console.error("Failed to release AI quota reservation:", err);
  }
}

/**
 * Normalize + sanitize the parsed request payload for downstream use.
 */
function sanitizePayload(
  input: z.infer<typeof schema>,
): {
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
    saveToProfile: Boolean(input.saveToProfile),
  };
}

/* ------------------------------------------------------------------ */
/* POST — generate resume                                             */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  let reservedEventId: string | null = null;
  let reservedUserId: string | null = null;

  try {
    /* -------- Auth -------- */
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const userId = session.user.id;

    /* -------- Rate limit (strict) -------- */
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

    /* -------- Body parsing -------- */
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

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

    /* -------- Plan -------- */
    let effectivePlan = "free";
    try {
      const effective = await getEffectivePlan(userId, {
        persistDowngrade: true,
      });
      effectivePlan = effective.plan;
    } catch (planErr) {
      console.error("Resume getEffectivePlan failed:", planErr);
    }

    /* -------- Quota reservation -------- */
    try {
      const reserveResult = await db.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        return assertAndReserveAiUsage(tx, {
          userId,
          plan: effectivePlan,
          kind: QUOTA_KIND,
          meta: data.targetRole || data.fullName,
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
          { status: 403 },
        );
      }

      reservedEventId = reserveResult.usageEventId ?? null;
      reservedUserId = userId;
    } catch (quotaErr) {
      console.error("Resume quota reserve failed:", quotaErr);
      return infraUnavailable(
        "QUOTA_INFRA_ERROR",
        "Service temporarily unavailable. Please try again shortly.",
      );
    }

    /* -------- AI attempt -------- */
    const systemPrompt = buildResumeSystemPrompt(data.tone);
    const userPrompt = buildResumeUserPrompt(data);

    let text: string | null = null;
    let source: "ai" | "template" = "template";

    try {
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
        if (
          !isWeakResumeOutput(scrubbed) &&
          !looksHallucinated(scrubbed, data)
        ) {
          text = scrubbed;
          source = "ai";
          console.info("Resume AI ok", {
            provider: meta.provider,
            model: meta.model,
            latencyMs: meta.latencyMs,
          });
        } else {
          console.error("Resume AI rejected (weak/hallucination)", {
            provider: meta.provider,
            model: meta.model,
          });
        }
      }
    } catch (aiErr) {
      console.error("Resume AI failed:", aiErr);
      text = null;
    }

    /* -------- Template fallback + quota release -------- */
    if (!text) {
      await safeReleaseUsage(reservedUserId, reservedEventId);
      reservedEventId = null;
      text = buildTemplateResume(data);
      source = "template";
    }

    /* -------- Optional save to profile -------- */
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

        await db.profile.upsert({
          where: { userId },
          create: { userId, ...profileData },
          update: profileData,
        });

        if (data.fullName) {
          await db.user.update({
            where: { id: userId },
            data: { name: data.fullName },
          });
        }
        profileSaved = true;
      } catch (saveErr) {
        console.error("Resume saveToProfile failed:", saveErr);
      }
    }

    /* -------- Success -------- */
    return NextResponse.json({
      success: true,
      resume: text,
      source,
      profileSaved,
      message: profileSaved
        ? "Resume ready. Profile notes updated."
        : "Resume ready.",
    });
  } catch (error) {
    console.error("Resume generate error:", error);
    await safeReleaseUsage(reservedUserId, reservedEventId);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 },
    );
  }
}
