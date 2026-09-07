import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { aiRatelimit } from "@/lib/ratelimit";
import { buildTemplateResume, chatCompletion } from "@/lib/ai";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import {
  assertAndReserveAiUsage,
  lockUserRow,
  releaseUsageEventById,
} from "@/lib/quota";

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
    const { success } = await aiRatelimit.limit(
      `resume_gen_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
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

    const data = parsed.data;
    const effective = await getEffectivePlan(session.user.id, {
      persistDowngrade: true,
    });

    const reserveResult = await db.$transaction(async (tx) => {
      await lockUserRow(tx, session.user.id);
      return assertAndReserveAiUsage(tx, {
        userId: session.user.id,
        plan: effective.plan,
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

    const systemPrompt = `You are a professional resume writer.
Return plain text only (no HTML, no markdown code fences).
Structure with clear section headings: Summary, Experience, Education, Skills.
Be concise and truthful; do not invent employers or degrees not implied by the user.`;

    const userPrompt = `Full name: ${data.fullName}
Email: ${data.email || "n/a"}
Phone: ${data.phone || "n/a"}
Location: ${data.location || "n/a"}
Target role: ${data.targetRole || "n/a"}
Summary notes: ${data.summary || "n/a"}
Experience: ${data.experience || "n/a"}
Education: ${data.education || "n/a"}
Skills: ${data.skills || "n/a"}`;

    let text: string | null = null;
    try {
      text = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1800, temperature: 0.4 }
      );
    } catch (aiErr) {
      console.error("Resume AI failed:", aiErr);
      text = null;
    }

    if (!text || text.trim().length < 40) {
      if (reservedEventId && reservedUserId) {
        await db.$transaction(async (tx) => {
          await releaseUsageEventById(tx, {
            userId: reservedUserId!,
            usageEventId: reservedEventId!,
          });
        });
        reservedEventId = null;
      }
      text = buildTemplateResume(data);
    }

    // Strip accidental HTML tags from model output
    const safeText = text.replace(/<[^>]+>/g, "").trim();

    return NextResponse.json({
      success: true,
      resume: safeText,
      source: text === safeText && text.length > 40 ? "ai" : "template",
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
    return NextResponse.json({ error: "Failed to generate resume" }, { status: 500 });
  }
}
