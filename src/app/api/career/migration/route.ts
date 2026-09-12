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
  const L = locale || "en";
  const packs: Record<
    string,
    {
      originFallback: string;
      title: (j: string) => string;
      summary: (j: string, o: string) => string;
      countries: Array<{
        country: string;
        demand: string;
        pathway: string;
        notes: string;
      }>;
      caveats: string[];
    }
  > = {
    fa: {
      originFallback: "کشور مبدأ",
      title: (j) => `گزینه‌های مهاجرت شغلی برای ${j}`,
      summary: (j, o) =>
        `بر اساس نقش «${j}» و مبدأ «${o}»، چند بازار که معمولاً به مهارت‌های مشابه نیاز دارند فهرست شده‌اند. این راهنمای کلی است و جایگزین مشاوره حقوقی یا مهاجرتی نیست.`,
      countries: [
        {
          country: "آلمان / اتحادیه اروپا",
          demand:
            "تقاضای پایدار برای تخصص‌های فنی، بهداشت، ساخت‌وساز و IT در بسیاری از ایالت‌ها.",
          pathway:
            "ویزای مهارت / کارت آبی اتحادیه اروپا (بسته به مدرک، پیشنهاد شغلی و سطح زبان).",
          notes:
            "معمولاً نیاز به مدرک به‌رسمیت‌شناخته‌شده و حداقل سطح زبان دارد.",
        },
        {
          country: "کانادا",
          demand:
            "سیستم امتیازمحور برای نیروی کار ماهر؛ مشاغل فهرست‌شده در NOC شانس بهتری دارند.",
          pathway: "Express Entry / برنامه‌های استانی (PNP).",
          notes: "آزمون زبان (IELTS/TEF) و ارزیابی مدرک (ECA) معمولاً لازم است.",
        },
        {
          country: "استرالیا",
          demand: "فهرست مهارت‌های مورد نیاز نقش مهمی در واجد شرایط بودن دارد.",
          pathway: "ویزای مهارت مستقل یا حمایت کارفرما.",
          notes: "ارزیابی مهارت توسط نهاد مربوطه و امتیاز سن/زبان مهم است.",
        },
        {
          country: "کشورهای حوزه خلیج (امارات، قطر، عمان)",
          demand: "تقاضای پروژه‌محور برای ساخت، انرژی، سلامت و فناوری.",
          pathway: "ویزای کار با پیشنهاد شغلی کارفرما.",
          notes: "معمولاً قراردادمحور است؛ مسیر اقامت دائم محدودتر است.",
        },
      ],
      caveats: [
        "قوانین مهاجرت دائماً تغییر می‌کنند؛ منبع رسمی کشور مقصد را چک کنید.",
        "تحریم‌ها، محدودیت بانکی یا گذرنامه می‌تواند مسیر را سخت‌تر کند.",
        "این خروجی مشاوره حقوقی نیست.",
      ],
    },
    ar: {
      originFallback: "بلد المنشأ",
      title: (j) => `خيارات الهجرة المهنية لـ ${j}`,
      summary: (j, o) =>
        `بناءً على دور «${j}» ومنشأ «${o}»، هذه أسواق غالباً تحتاج مهارات مشابهة. توجيه عام فقط وليس استشارة قانونية.`,
      countries: [
        {
          country: "ألمانيا / الاتحاد الأوروبي",
          demand:
            "طلب ثابت على المهارات التقنية والصحية والبناء وتقنية المعلومات.",
          pathway:
            "تأشيرة مهنية / البطاقة الزرقاء (حسب الشهادة وعرض العمل واللغة).",
          notes: "غالباً يتطلب اعتراف بالشهادات ومستوى لغة أدنى.",
        },
        {
          country: "كندا",
          demand: "نظام نقاط للعمالة الماهرة؛ المهن المدرجة في NOC أفضل.",
          pathway: "Express Entry / برامج الترشيح الإقليمية (PNP).",
          notes: "اختبارات لغة وتقييم شهادات (ECA) شائعة.",
        },
        {
          country: "أستراليا",
          demand: "قوائم المهن المهارية تؤثر بقوة على الأهلية.",
          pathway: "تأشيرة مهارة مستقلة أو رعاية صاحب عمل.",
          notes: "تقييم مهني ونقاط العمر/اللغة مهمة.",
        },
        {
          country: "دول الخليج (الإمارات، قطر، عمان)",
          demand: "طلب قائم على المشاريع في البناء والطاقة والصحة والتقنية.",
          pathway: "تأشيرة عمل برعاية صاحب العمل.",
          notes: "غالباً عقود مؤقتة؛ الإقامة الدائمة محدودة.",
        },
      ],
      caveats: [
        "قوانين الهجرة تتغير؛ راجع المصادر الرسمية.",
        "العقوبات أو قيود جواز السفر قد تعيق المسار.",
        "هذا ليس استشارة قانونية.",
      ],
    },
    de: {
      originFallback: "Herkunftsland",
      title: (j) => `Migrationsoptionen für ${j}`,
      summary: (j, o) =>
        `Basierend auf der Rolle „${j}“ und Herkunft „${o}“: Märkte mit typischer Nachfrage nach ähnlichen Skills. Nur Orientierung — keine Rechtsberatung.`,
      countries: [
        {
          country: "Deutschland / EU",
          demand: "Stabile Nachfrage nach Technik, Gesundheit, Bau und IT.",
          pathway: "Fachkräfteeinwanderung / Blaue Karte EU.",
          notes: "Anerkennung von Abschlüssen und Sprachniveau oft nötig.",
        },
        {
          country: "Kanada",
          demand: "Punktesystem; NOC-gelistete Berufe sind im Vorteil.",
          pathway: "Express Entry / Provincial Nominee (PNP).",
          notes: "Sprachtests und Credential Assessment üblich.",
        },
        {
          country: "Australien",
          demand:
            "Skilled-occupation-Listen beeinflussen die Eligibility stark.",
          pathway: "Independent skilled visa oder Employer Sponsorship.",
          notes: "Skills assessment und Punkte für Alter/Sprache zählen.",
        },
        {
          country: "Golfstaaten (VAE, Katar, Oman)",
          demand: "Projektgetriebene Nachfrage in Bau, Energie, Health, Tech.",
          pathway: "Arbeitgeber-gesponsertes Arbeitsvisum.",
          notes: "Meist befristete Verträge; dauerhafte Residenz begrenzt.",
        },
      ],
      caveats: [
        "Einwanderungsregeln ändern sich; offizielle Quellen prüfen.",
        "Sanktionen oder Passbeschränkungen können Wege blockieren.",
        "Keine Rechtsberatung.",
      ],
    },
    es: {
      originFallback: "país de origen",
      title: (j) => `Opciones de migración para ${j}`,
      summary: (j, o) =>
        `Según el rol «${j}» y origen «${o}», mercados que suelen demandar habilidades similares. Orientación general, no asesoría legal.`,
      countries: [
        {
          country: "Alemania / UE",
          demand: "Demanda estable en técnica, salud, construcción e IT.",
          pathway: "Visado de cualificados / Tarjeta Azul UE.",
          notes: "Suele exigir homologación y nivel de idioma.",
        },
        {
          country: "Canadá",
          demand: "Sistema de puntos; ocupaciones NOC tienen ventaja.",
          pathway: "Express Entry / PNP provincial.",
          notes: "Tests de idioma y ECA son habituales.",
        },
        {
          country: "Australia",
          demand: "Listas de ocupaciones cualificadas influyen mucho.",
          pathway: "Visado independiente o sponsorship del empleador.",
          notes: "Skills assessment y puntos de edad/idioma importan.",
        },
        {
          country: "Golfo (EAU, Catar, Omán)",
          demand: "Demanda por proyectos en construcción, energía y tech.",
          pathway: "Visado laboral patrocinado por empleador.",
          notes: "Contratos temporales; residencia permanente limitada.",
        },
      ],
      caveats: [
        "Las normas migratorias cambian; consulte fuentes oficiales.",
        "Sanciones o límites de pasaporte pueden bloquear rutas.",
        "No es asesoramiento legal.",
      ],
    },
    fr: {
      originFallback: "pays d'origine",
      title: (j) => `Options de migration pour ${j}`,
      summary: (j, o) =>
        `D'après le rôle « ${j} » et l'origine « ${o} », marchés qui recrutent souvent des compétences proches. Orientation générale uniquement.`,
      countries: [
        {
          country: "Allemagne / UE",
          demand: "Demande stable en technique, santé, BTP et IT.",
          pathway: "Visa métiers en tension / Carte bleue européenne.",
          notes:
            "Reconnaissance des diplômes et niveau de langue souvent requis.",
        },
        {
          country: "Canada",
          demand: "Système à points ; métiers NOC avantagés.",
          pathway: "Entrée express / PNP provincial.",
          notes: "Tests de langue et ECA courants.",
        },
        {
          country: "Australie",
          demand: "Listes d'occupations qualifiées déterminantes.",
          pathway: "Visa skilled indépendant ou parrainage employeur.",
          notes: "Évaluation des compétences et points âge/langue.",
        },
        {
          country: "Golfe (EAU, Qatar, Oman)",
          demand: "Demande liée aux projets (construction, énergie, tech).",
          pathway: "Visa de travail sponsorisé par l'employeur.",
          notes:
            "Contrats souvent temporaires ; résidence permanente limitée.",
        },
      ],
      caveats: [
        "Les règles changent ; vérifiez les sources officielles.",
        "Sanctions ou contraintes de passeport peuvent bloquer.",
        "Ceci n'est pas un conseil juridique.",
      ],
    },
    hi: {
      originFallback: "मूल देश",
      title: (j) => `${j} के लिए प्रवास विकल्प`,
      summary: (j, o) =>
        `भूमिका «${j}» और मूल «${o}» के आधार पर समान कौशल की माँग वाले बाज़ार। केवल सामान्य मार्गदर्शन — कानूनी सलाह नहीं।`,
      countries: [
        {
          country: "जर्मनी / EU",
          demand: "तकनीक, स्वास्थ्य, निर्माण और IT में स्थिर माँग।",
          pathway: "स्किल्ड वर्कर वीज़ा / EU Blue Card।",
          notes: "डिग्री मान्यता और भाषा स्तर अक्सर जरूरी।",
        },
        {
          country: "कनाडा",
          demand: "पॉइंट्स सिस्टम; NOC सूचीबद्ध पेशे बेहतर।",
          pathway: "Express Entry / PNP।",
          notes: "भाषा टेस्ट और ECA सामान्य।",
        },
        {
          country: "ऑस्ट्रेलिया",
          demand: "स्किल्ड ऑक्यूपेशन सूचियाँ पात्रता तय करती हैं।",
          pathway: "स्वतंत्र स्किल्ड वीज़ा या नियोक्ता स्पॉन्सरशिप।",
          notes: "स्किल्स असेसमेंट और आयु/भाषा पॉइंट्स महत्वपूर्ण।",
        },
        {
          country: "खाड़ी देश (UAE, कतर, ओमान)",
          demand: "निर्माण, ऊर्जा, स्वास्थ्य, टेक में प्रोजेक्ट माँग।",
          pathway: "नियोक्ता-प्रायोजित वर्क वीज़ा।",
          notes: "अक्सर अनुबंध आधारित; स्थायी निवास सीमित।",
        },
      ],
      caveats: [
        "नियम बदलते रहते हैं; आधिकारिक स्रोत देखें।",
        "प्रतिबंध या पासपोर्ट सीमाएँ मार्ग रोक सकती हैं।",
        "यह कानूनी सलाह नहीं है।",
      ],
    },
    en: {
      originFallback: "origin country",
      title: (j) => `Skill-based migration options for ${j}`,
      summary: (j, o) =>
        `Based on the role “${j}” and origin “${o}”, markets that often hire similar skills. General orientation only — not legal advice.`,
      countries: [
        {
          country: "Germany / EU",
          demand:
            "Steady demand for technical, healthcare, construction and IT skills.",
          pathway:
            "Skilled worker visa / EU Blue Card (credentials, job offer, language).",
          notes:
            "Often requires recognized credentials and minimum language level.",
        },
        {
          country: "Canada",
          demand:
            "Points-based skilled immigration; NOC-listed occupations fare better.",
          pathway: "Express Entry / Provincial Nominee Programs (PNP).",
          notes: "Language tests and credential assessment (ECA) are common.",
        },
        {
          country: "Australia",
          demand: "Skilled occupation lists strongly influence eligibility.",
          pathway: "Independent skilled visa or employer sponsorship.",
          notes: "Skills assessment and points for age/language matter.",
        },
        {
          country: "Gulf states (UAE, Qatar, Oman)",
          demand:
            "Project-driven demand in construction, energy, health and tech.",
          pathway: "Employer-sponsored work visa.",
          notes:
            "Usually contract-based; permanent residency paths are limited.",
        },
      ],
      caveats: [
        "Immigration rules change often; check official sources.",
        "Sanctions, banking limits or passport constraints can block pathways.",
        "This output is not legal advice.",
      ],
    },
  };

  const pack = packs[L] || packs.en;
  const origin = originCountry || pack.originFallback;
  return {
    title: pack.title(jobTitle),
    summary: pack.summary(jobTitle, origin),
    countries: pack.countries,
    caveats: pack.caveats,
    source: "heuristic",
  };
}

function parseMigrationJson(
  text: string,
  jobTitle: string
): MigrationResult | null {
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
        country: String(c.country || "").slice(0, 120),
        demand: String(c.demand || "").slice(0, 500),
        pathway: String(c.pathway || "").slice(0, 500),
        notes: String(c.notes || "").slice(0, 500),
      }))
      .filter((c) => c.country && (c.demand || c.pathway))
      .slice(0, 8);
    if (countries.length < 2) return null;
    return {
      title: String(
        raw.title || `Skill-based migration options for ${jobTitle}`
      ).slice(0, 200),
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
        return NextResponse.json(
          {
            error: quota.error,
            code: quota.code,
            limit: quota.limit,
            used: quota.used,
          },
          { status: 403 }
        );
      }
      reservedEventId = quota.usageEventId ?? null;
      reservedUserId = user.id;
    } catch (err) {
      console.error("Migration quota fail-open:", err);
    }

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
