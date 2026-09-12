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
  assertAndReserveAiUsage,
  lockUserRow,
  releaseUsageEventById,
} from "@/lib/quota";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { neutralizeInstructionish } from "@/lib/ai-sanitize";

const bodySchema = z.object({
  jobTitle: z.string().trim().min(2).max(120),
  skills: z.string().max(1500).optional(),
  skillsToBuild: z.array(z.string().max(200)).max(12).optional().default([]),
  industry: z.string().max(120).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  country: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
  education: z.string().max(200).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  locale: z
    .enum(["en", "fa", "ar", "es", "fr", "hi", "de"])
    .optional()
    .default("en"),
});

type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

type MigrationResult = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  caveats: string[];
  source: "ai" | "heuristic";
};

function heuristicMigration(
  jobTitle: string,
  originCountry: string | undefined,
  locale: string
): MigrationResult {
  const fa = locale === "fa";
  const origin = originCountry || (fa ? "کشور مبدأ" : "origin country");
  return {
    title: fa
      ? `گزینه‌های مهاجرت شغلی برای ${jobTitle}`
      : `Skill-based migration options for ${jobTitle}`,
    summary: fa
      ? `بر اساس نقش «${jobTitle}» و مبدأ «${origin}»، چند بازار که معمولاً به مهارت‌های مشابه نیاز دارند فهرست شده‌اند. این راهنمای کلی است و جایگزین مشاوره حقوقی یا مهاجرتی نیست.`
      : `Based on the role “${jobTitle}” and origin “${origin}”, here are markets that often hire similar skills. This is general orientation only — not legal or immigration advice.`,
    countries: [
      {
        country: fa ? "آلمان / اتحادیه اروپا" : "Germany / EU",
        demand: fa
          ? "تقاضای پایدار برای تخصص‌های فنی، بهداشت، ساخت‌وساز و IT در بسیاری از ایالت‌ها."
          : "Steady demand for technical, healthcare, construction and IT skills in many states.",
        pathway: fa
          ? "ویزای مهارت / کارت آبی اتحادیه اروپا (بسته به مدرک، پیشنهاد شغلی و سطح زبان)."
          : "Skilled worker visa / EU Blue Card (depends on credentials, job offer, language).",
        notes: fa
          ? "معمولاً نیاز به مدرک به‌رسمیت‌شناخته‌شده و حداقل سطح زبان دارد."
          : "Often requires recognized credentials and minimum language level.",
      },
      {
        country: fa ? "کانادا" : "Canada",
        demand: fa
          ? "سیستم امتیازمحور برای نیروی کار ماهر؛ مشاغل فهرست‌شده در NOC شانس بهتری دارند."
          : "Points-based skilled immigration; NOC-listed occupations fare better.",
        pathway: fa
          ? "Express Entry / برنامه‌های استانی (PNP)."
          : "Express Entry / Provincial Nominee Programs (PNP).",
        notes: fa
          ? "آزمون زبان (IELTS/TEF) و ارزیابی مدرک (ECA) معمولاً لازم است."
          : "Language tests and credential assessment (ECA) are commonly required.",
      },
      {
        country: fa ? "استرالیا" : "Australia",
        demand: fa
          ? "فهرست مهارت‌های مورد نیاز (MLTSSL/STSOL) نقش مهمی دارد."
          : "Skilled occupation lists strongly influence eligibility.",
        pathway: fa
          ? "ویزای مهارت مستقل یا حمایت کارفرما."
          : "Independent skilled visa or employer sponsorship.",
        notes: fa
          ? "ارزیابی مهارت توسط نهاد مربوطه و امتیاز سن/زبان مهم است."
          : "Skills assessment body + points for age/language matter.",
      },
      {
        country: fa ? "کشورهای حوزه خلیج (امارات، قطر، عمان)" : "Gulf states (UAE, Qatar, Oman)",
        demand: fa
          ? "تقاضای پروژه‌محور برای ساخت، انرژی، سلامت و فناوری."
          : "Project-driven demand in construction, energy, health and tech.",
        pathway: fa
          ? "ویزای کار با پیشنهاد شغلی کارفرما."
          : "Employer-sponsored work visa.",
        notes: fa
          ? "معمولاً مسیر اقامت دائم محدود است؛ قرارداد محور است."
          : "Usually contract-based; permanent residency paths are limited.",
      },
    ],
    caveats: fa
      ? [
          "قوانین مهاجرت دائماً تغییر می‌کنند؛ منبع رسمی کشور مقصد را چک کنید.",
          "تحریم‌ها، محدودیت بانکی یا گذرنامه می‌تواند مسیر را سخت‌تر کند.",
          "این خروجی مشاوره حقوقی نیست.",
        ]
      : [
          "Immigration rules change often; check official government sources.",
          "Sanctions, banking limits or passport constraints can block pathways.",
          "This output is not legal advice.",
        ],
    source: "heuristic",
  };
}

function parseMigrationJson(text: string, jobTitle: string): MigrationResult | null {
  let jsonStr = text.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
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
    const countries = (raw.countries || [])
      .map((c) => ({
        country: String(c.country || "").slice(0, 80),
        demand: String(c.demand || "").slice(0, 400),
        pathway: String(c.pathway || "").slice(0, 400),
        notes: String(c.notes || "").slice(0, 400),
      }))
      .filter((c) => c.country && c.demand)
      .slice(0, 8);
    if (countries.length < 2) return null;
    return {
      title: String(raw.title || `Migration options for ${jobTitle}`).slice(
        0,
        200
      ),
      summary: String(raw.summary || "").slice(0, 1200),
      countries,
      caveats: (raw.caveats || [])
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 8),
      source: "ai",
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let reservedEventId: string | null = null;
  let reservedUserId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    try {
      const limit = await aiRatelimit.limit(
        `career_migration_${session.user.id}_${ip}`
      );
      if (!limit.success) {
        return rateLimitedResponse(limit, "Too many requests");
      }
    } catch {
      // fail-open
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const jobTitle = neutralizeInstructionish(parsed.data.jobTitle).slice(
      0,
      120
    );
    const skills = parsed.data.skills
      ? neutralizeInstructionish(parsed.data.skills).slice(0, 1500)
      : undefined;
    const country = parsed.data.country
      ? neutralizeInstructionish(parsed.data.country).slice(0, 120)
      : undefined;
    const location = parsed.data.location
      ? neutralizeInstructionish(parsed.data.location).slice(0, 200)
      : undefined;
    const education = parsed.data.education
      ? neutralizeInstructionish(parsed.data.education).slice(0, 200)
      : undefined;
    const industry = parsed.data.industry
      ? neutralizeInstructionish(parsed.data.industry).slice(0, 120)
      : undefined;
    const locale = normalizeCareerLocale(parsed.data.locale);
    const languageName = languageNameForPrompt(locale);

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
      /* keep */
    }

    try {
      const quota = await db.$transaction(async (tx) => {
        try {
          await lockUserRow(tx, user.id);
        } catch {
          /* ignore */
        }
        return assertAndReserveAiUsage(tx, {
          userId: user.id,
          plan,
          kind: "ai_career_risk",
          meta: `migration:${jobTitle}`,
        });
      });
      if (!quota.ok) {
        // still allow heuristic
      } else {
        reservedEventId = quota.usageEventId ?? null;
        reservedUserId = user.id;
      }
    } catch (err) {
      console.error("Migration quota fail-open:", err);
    }

    const systemPrompt = `You are a careful international labor-mobility analyst.
Write ALL human-readable fields ENTIRELY in ${languageName}.
JSON keys stay in English.

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

    const userPrompt = `Language: ${languageName}
Job title: ${jobTitle}
Skills: ${skills || "n/a"}
Skills to build: ${(parsed.data.skillsToBuild || []).join(", ") || "n/a"}
Industry: ${industry || "n/a"}
Experience years: ${parsed.data.experienceYears ?? "n/a"}
Origin country: ${country || "n/a"}
City: ${location || "n/a"}
Education: ${education || "n/a"}
Automation risk level: ${parsed.data.riskLevel ?? "n/a"}`;

    let result: MigrationResult | null = null;

    try {
      const { text } = await chatCompletionWithMeta(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 1600, temperature: 0.35, timeoutMs: 28_000, maxAttempts: 3 }
      );
      if (text) {
        result = parseMigrationJson(text, jobTitle);
      }
    } catch (err) {
      console.error("Migration AI failed:", err);
    }

    if (!result) {
      if (reservedEventId && reservedUserId) {
        try {
          await releaseUsageEventById(db, {
            userId: reservedUserId,
            usageEventId: reservedEventId,
          });
        } catch {
          /* ignore */
        }
      }
      result = heuristicMigration(jobTitle, country, locale);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Migration error:", error);
    if (reservedEventId && reservedUserId) {
      try {
        await releaseUsageEventById(db, {
          userId: reservedUserId,
          usageEventId: reservedEventId,
        });
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json(
      { error: "Failed to analyze migration options" },
      { status: 500 }
    );
  }
}
