import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
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
import {
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
  isWeakResumeOutput,
  looksHallucinated,
  normalizeTone,
  scrubResumeText,
} from "@/lib/resume-ai";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  targetRole: z.string().max(120).optional().or(z.literal("")),
  summary: z.string().max(2000).optional().or(z.literal("")),
  experience: z.string().max(8000).optional().or(z.literal("")),
  education: z.string().max(4000).optional().or(z.literal("")),
  skills: z.string().max(2000).optional().or(z.literal("")),
  languages: z.string().max(500).optional().or(z.literal("")),
  tone: z
    .enum(["professional", "confident", "concise"])
    .optional()
    .default("professional"),
  saveToProfile: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  let reservedEventId: string | null = null;
  let reservedUserId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await aiRatelimit.limit(
      `resume_gen_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests. Please wait.");
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const tone = normalizeTone(parsed.data.tone);
    const data = {
      fullName: neutralizeInstructionish(parsed.data.fullName).slice(0, 120),
      email: parsed.data.email || "",
      phone: neutralizeInstructionish(parsed.data.phone || "").slice(0, 40),
      location: neutralizeInstructionish(parsed.data.location || "").slice(
        0,
        120
      ),
      targetRole: neutralizeInstructionish(parsed.data.targetRole || "").slice(
        0,
        120
      ),
      summary: neutralizeInstructionish(parsed.data.summary || "").slice(
        0,
        2000
      ),
      experience: neutralizeInstructionish(parsed.data.experience || "").slice(
        0,
        8000
      ),
      education: neutralizeInstructionish(parsed.data.education || "").slice(
        0,
        4000
      ),
      skills: neutralizeInstructionish(parsed.data.skills || "").slice(0, 2000),
      languages: neutralizeInstructionish(parsed.data.languages || "").slice(
        0,
        500
      ),
      tone,
      saveToProfile: Boolean(parsed.data.saveToProfile),
    };

    let effectivePlan = "free";
    try {
      const effective = await getEffectivePlan(session.user.id, {
        persistDowngrade: true,
      });
      effectivePlan = effective.plan;
    } catch (planErr) {
      console.error("Resume getEffectivePlan failed:", planErr);
    }

    // Quota must succeed before AI — no silent bypass
    try {
      const reserveResult = await db.$transaction(async (tx) => {
        await lockUserRow(tx, session.user.id);
        return assertAndReserveAiUsage(tx, {
          userId: session.user.id,
          plan: effectivePlan,
          kind: "ai_resume",
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
          { status: 403 }
        );
      }

      reservedEventId = reserveResult.usageEventId ?? null;
      reservedUserId = session.user.id;
    } catch (quotaErr) {
      console.error("Resume quota reserve failed:", quotaErr);
      return NextResponse.json(
        {
          error: "Service temporarily unavailable. Please try again shortly.",
          code: "QUOTA_INFRA_ERROR",
        },
        { status: 503 }
      );
    }

    const systemPrompt = buildResumeSystemPrompt(tone);
    const userPrompt = buildResumeUserPrompt(data);

    let text: string | null = null;
    let source: "ai" | "template" = "template";

    try {
      const { text: aiText, meta } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1800, temperature: 0.35, timeoutMs: 25_000 }
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

    if (!text) {
      if (reservedEventId && reservedUserId) {
        try {
          await db.$transaction(async (tx) => {
            await releaseUsageEventById(tx, {
              userId: reservedUserId!,
              usageEventId: reservedEventId!,
            });
          });
        } catch (releaseErr) {
          console.error("Failed to release resume AI quota:", releaseErr);
        }
        reservedEventId = null;
      }
      text = buildTemplateResume(data);
      source = "template";
    }

    let profileSaved = false;
    if (data.saveToProfile) {
      try {
        await db.profile.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            bio: data.summary || null,
            skills: data.skills || data.targetRole || null,
            experience: data.experience || null,
            education: data.education || null,
            phone: data.phone || null,
            location: data.location || null,
          },
          update: {
            bio: data.summary || null,
            skills: data.skills || data.targetRole || null,
            experience: data.experience || null,
            education: data.education || null,
            phone: data.phone || null,
            location: data.location || null,
          },
        });

        if (data.fullName) {
          await db.user.update({
            where: { id: session.user.id },
            data: { name: data.fullName },
          });
        }
        profileSaved = true;
      } catch (saveErr) {
        console.error("Resume saveToProfile failed:", saveErr);
      }
    }

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
    if (reservedEventId && reservedUserId) {
      try {
        await db.$transaction(async (tx) => {
          await releaseUsageEventById(tx, {
            userId: reservedUserId!,
            usageEventId: reservedEventId!,
          });
        });
      } catch (releaseErr) {
        console.error("Failed to release resume AI quota:", releaseErr);
      }
    }
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}
