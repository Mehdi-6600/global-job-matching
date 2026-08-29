import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";
import { chatCompletion } from "@/lib/ai";
import {
  heuristicCareerRisk,
  isPaidPlan,
  parseRiskJson,
} from "@/lib/career-risk";

const schema = z.object({
  jobTitle: z.string().min(2).max(120),
  skills: z.string().max(1500).optional().or(z.literal("")),
  experienceYears: z.number().min(0).max(50).optional(),
  industry: z.string().max(120).optional().or(z.literal("")),
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
      `career_risk_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jobTitle, skills, experienceYears, industry } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    const paid = isPaidPlan(user?.plan);

    const system = `You are a careful labor-market analyst. Estimate how exposed a job is to AI/automation in the next 5–10 years.
Return ONLY valid JSON (no markdown) with this shape:
{
  "jobTitle": string,
  "riskScore": number 0-100,
  "riskLevel": "low" | "medium" | "high",
  "summary": string,
  "reasons": string[],
  "skillsToBuild": string[],
  "alternatives": string[]
}
Be balanced. Do not claim certainty. alternatives should be realistic career pivots.`;

    const userMsg = `Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Years of experience: ${experienceYears ?? "n/a"}
Industry: ${industry || "n/a"}`;

    let result =
      parseRiskJson(
        (await chatCompletion(
          [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
          { maxTokens: 1200, temperature: 0.4 }
        )) || "",
        jobTitle
      ) || heuristicCareerRisk(jobTitle, skills);

    // Free users: hide alternatives detail
    if (!paid) {
      result = {
        ...result,
        alternatives: [],
      };
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      alternativesLocked: !paid,
      plan: user?.plan || "free",
      message: paid
        ? "Full analysis including alternative careers"
        : "Risk analysis is free. Upgrade your plan to unlock alternative career suggestions.",
    });
  } catch (error) {
    console.error("career risk error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
