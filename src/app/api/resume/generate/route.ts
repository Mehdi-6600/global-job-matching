import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";
import { buildTemplateResume, chatCompletion } from "@/lib/ai";
import { getPlanLimits } from "@/lib/plan-limits";
import { getEffectivePlan } from "@/lib/subscription";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  targetRole: z.string().max(120).optional().or(z.literal("")),
  summary: z.string().max(2000).optional().or(z.literal("")),
  skills: z.string().max(1500).optional().or(z.literal("")),
  experience: z.string().max(8000).optional().or(z.literal("")),
  education: z.string().max(3000).optional().or(z.literal("")),
  languages: z.string().max(500).optional().or(z.literal("")),
  tone: z.enum(["professional", "confident", "concise"]).optional(),
  saveToProfile: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(
      `resume_gen_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const effective = await getEffectivePlan(user.id);
    const limits = getPlanLimits(effective.plan);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const usedAi = await db.notification.count({
      where: {
        userId: user.id,
        type: "ai_resume",
        createdAt: { gte: monthStart },
      },
    });

    if (usedAi >= limits.maxAiGenerationsPerMonth) {
      return NextResponse.json(
        {
          error: `AI resume limit reached this month (${limits.maxAiGenerationsPerMonth}). Upgrade your plan for more.`,
          code: "PLAN_LIMIT_AI",
          limit: limits.maxAiGenerationsPerMonth,
          used: usedAi,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
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
    const tone = data.tone || "professional";

    const systemPrompt = `You are an expert resume writer for international job seekers.
Write a clean, ATS-friendly resume in English (plain text, no markdown tables).
Tone: ${tone}.
Structure:
1) Name + target role
2) Contact line
3) Professional Summary (3–5 sentences)
4) Skills (comma-separated or short bullets with • )
5) Experience (reverse chronological, impact-focused bullets)
6) Education
7) Languages (if provided)
Do not invent employers or degrees the user did not mention. Improve wording and clarity only.
Return ONLY the resume text.`;

    const userPrompt = `Full name: ${data.fullName}
Email: ${data.email || "n/a"}
Phone: ${data.phone || "n/a"}
Location: ${data.location || "n/a"}
Target role: ${data.targetRole || "n/a"}
Summary notes: ${data.summary || "n/a"}
Skills: ${data.skills || "n/a"}
Experience: ${data.experience || "n/a"}
Education: ${data.education || "n/a"}
Languages: ${data.languages || "n/a"}`;

    let resumeText = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 2200, temperature: 0.55 }
    );

    let source: "ai" | "template" = "ai";
    if (!resumeText) {
      source = "template";
      resumeText = buildTemplateResume({
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        location: data.location || undefined,
        targetRole: data.targetRole || undefined,
        summary: data.summary || undefined,
        skills: data.skills || undefined,
        experience: data.experience || undefined,
        education: data.education || undefined,
        languages: data.languages || undefined,
      });
    }

    if (source === "ai") {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "ai_resume",
          title: "AI resume generated",
          message: "Your AI resume was generated successfully.",
          actionUrl: "/resume-builder",
        },
      });
    }

    if (data.saveToProfile) {
      await db.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          bio: data.summary || resumeText.slice(0, 500),
          skills: data.skills || null,
          experience: data.experience || resumeText,
          education: data.education || null,
          phone: data.phone || null,
          location: data.location || null,
        },
        update: {
          bio: data.summary || undefined,
          skills: data.skills || undefined,
          experience: data.experience || resumeText,
          education: data.education || undefined,
          phone: data.phone || undefined,
          location: data.location || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      resume: resumeText,
      source,
      message:
        source === "ai"
          ? "Resume generated with AI"
          : "AI key not configured — used professional template. Add OPENROUTER_API_KEY or OPENAI_API_KEY for AI generation.",
    });
  } catch (error) {
    console.error("Resume generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}
