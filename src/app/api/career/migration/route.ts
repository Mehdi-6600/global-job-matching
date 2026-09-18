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

/* ------------------------------------------------------------------ */
/* اسکیمای اعتبارسنجی                                                  */
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
  riskScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  locale: z
    .enum(["en", "fa", "ar", "es", "fr", "hi", "de"])
    .optional()
    .default("en"),
});

/* ------------------------------------------------------------------ */
/* انواع داده                                                          */
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
/* تحلیل heuristic (آفلاین) — ۷ زبان                                   */
/* ------------------------------------------------------------------ */

/**
 * تولید تحلیل مهاجرت به‌صورت آفلاین و بر اساس بسته‌های زبانی.
 *
 * این تابع زمانی استفاده می‌شود که:
 * - سهمیه‌ی AI تمام شده باشد.
 * - خطای زیرساختی رخ داده باشد.
 * - خروجی AI نامعتبر باشد.
 *
 * هر بسته‌ی زبانی شامل ۴ کشور مقصد و caveats اختصاصی است.
 */
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
    /* -------- فارسی -------- */
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
          notes:
            "آزمون زبان (IELTS/TEF) و ارزیابی مدرک (ECA) معمولاً لازم است.",
        },
        {
          country: "استرالیا",
          demand:
            "فهرست مهارت‌های مورد نیاز نقش مهمی در واجد شرایط بودن دارد.",
          pathway: "ویزای مهارت مستقل یا حمایت کارفرما.",
          notes:
            "ارزیابی مهارت توسط نهاد مربوطه و امتیاز سن/زبان مهم است.",
        },
        {
          country: "کشورهای حوزه خلیج (امارات، قطر، عمان)",
          demand: "تقاضای پروژه‌محور برای ساخت، انرژی، سلامت و فناوری.",
          pathway: "ویزای کار با پیشنهاد شغلی کارفرما.",
          notes:
            "معمولاً قراردادمحور است؛ مسیر اقامت دائم محدودتر است.",
        },
      ],
      caveats: [
        "قوانین مهاجرت دائماً تغییر می‌کنند؛ منبع رسمی کشور مقصد را چک کنید.",
        "تحریم‌ها، محدودیت بانکی یا گذرنامه می‌تواند مسیر را سخت‌تر کند.",
        "این خروجی مشاوره حقوقی نیست.",
      ],
    },

    /* -------- عربی -------- */
    ar: {
      originFallback: "بلد المنشأ",
      title: (j) => `خيارات الهجرة المهنية لـ ${j}`,
      summary: (j, o) =>
        `بناءً على دور «${j}» ومنشأ «${o}»، هذه أسواق غالباً تحتاج مهارات مشابهة. توجيه عام فقط وليس استشارة قانونية.`,
      countries: [
        {
          country: "ألمانيا / الاتحاد الأوروبي",
          demand:
            "طلب مستمر على المهارات التقنية والرعاية الصحية والبناء وتقنية المعلومات.",
          pathway: "تأشيرة المهارات / البطاقة الزرقاء الأوروبية.",
          notes: "غالباً يتطلب اعترافاً بالمؤهلات ومستوى لغة أدنى.",
        },
        {
          country: "كندا",
          demand: "هجرة قائمة على النقاط للعمالة الماهرة.",
          pathway: "Express Entry / برامج الترشيح الإقليمية (PNP).",
          notes: "اختبارات اللغة وتقييم الشهادات شائعة.",
        },
        {
          country: "أستراليا",
          demand: "قوائم المهن المطلوبة تؤثر بقوة على الأهلية.",
          pathway: "تأشيرة مهارات مستقلة أو رعاية صاحب عمل.",
          notes: "تقييم المهارات ونقاط العمر/اللغة مهمة.",
        },
        {
          country: "دول الخليج (الإمارات، قطر، عمان)",
          demand:
            "طلب مرتبط بالمشاريع في البناء والطاقة والصحة والتقنية.",
          pathway: "تأشيرة عمل برعاية صاحب العمل.",
          notes:
            "غالباً قائمة على العقود؛ مسارات الإقامة الدائمة محدودة.",
        },
      ],
      caveats: [
        "تتغير قوانين الهجرة باستمرار؛ راجع المصادر الرسمية.",
        "العقوبات أو قيود جواز السفر قد تعيق المسار.",
        "هذا ليس استشارة قانونية.",
      ],
    },

    /* -------- آلمانی -------- */
    de: {
      originFallback: "Herkunftsland",
      title: (j) => `Berufliche Migrationsoptionen für ${j}`,
      summary: (j, o) =>
        `Basierend auf der Rolle „${j}“ und Herkunft „${o}“ Märkte, die ähnliche Skills oft suchen. Nur Orientierung – keine Rechtsberatung.`,
      countries: [
        {
          country: "Deutschland / EU",
          demand:
            "Stetige Nachfrage nach Technik, Gesundheit, Bau und IT.",
          pathway: "Fachkräfteeinwanderung / EU Blue Card.",
          notes:
            "Anerkennung der Abschlüsse und Sprachniveau oft nötig.",
        },
        {
          country: "Kanada",
          demand: "Punktebasiertes System für Fachkräfte.",
          pathway: "Express Entry / Provincial Nominee (PNP).",
          notes: "Sprachtests und Credential Assessment üblich.",
        },
        {
          country: "Australien",
          demand: "Skilled-Occupation-Listen steuern die Eignung.",
          pathway:
            "Unabhängiges Skilled Visa oder Arbeitgeber-Sponsoring.",
          notes:
            "Skills Assessment und Punkte für Alter/Sprache zählen.",
        },
        {
          country: "Golfstaaten (VAE, Katar, Oman)",
          demand:
            "Projektbezogene Nachfrage in Bau, Energie, Health, Tech.",
          pathway: "Arbeitgeber-gesponsertes Work Visa.",
          notes:
            "Meist vertragsbasiert; dauerhafte Aufenthaltspfade begrenzt.",
        },
      ],
      caveats: [
        "Einwanderungsregeln ändern sich; offizielle Quellen prüfen.",
        "Sanktionen oder Passbeschränkungen können Wege blockieren.",
        "Keine Rechtsberatung.",
      ],
    },

    /* -------- اسپانیایی -------- */
    es: {
      originFallback: "país de origen",
      title: (j) => `Opciones de migración laboral para ${j}`,
      summary: (j, o) =>
        `Según el rol «${j}» y el origen «${o}», mercados que suelen contratar habilidades similares. Orientación general, no asesoría legal.`,
      countries: [
        {
          country: "Alemania / UE",
          demand: "Demanda estable en técnica, salud, construcción e IT.",
          pathway: "Visado de cualificados / Tarjeta Azul UE.",
          notes: "Suele exigir títulos reconocidos y nivel de idioma.",
        },
        {
          country: "Canadá",
          demand:
            "Inmigración por puntos para trabajadores cualificados.",
          pathway: "Express Entry / Programas provinciales (PNP).",
          notes:
            "Pruebas de idioma y evaluación de títulos son comunes.",
        },
        {
          country: "Australia",
          demand:
            "Listas de ocupaciones cualificadas influyen en la elegibilidad.",
          pathway: "Visado independiente o patrocinio del empleador.",
          notes:
            "Evaluación de skills y puntos por edad/idioma importan.",
        },
        {
          country: "Golfo (EAU, Catar, Omán)",
          demand:
            "Demanda por proyectos en construcción, energía, salud y tech.",
          pathway: "Visado de trabajo patrocinado por empleador.",
          notes:
            "Suele ser por contrato; residencia permanente limitada.",
        },
      ],
      caveats: [
        "Las normas migratorias cambian; consulta fuentes oficiales.",
        "Sanciones o límites de pasaporte pueden bloquear vías.",
        "Esto no es asesoría legal.",
      ],
    },

    /* -------- فرانسوی -------- */
    fr: {
      originFallback: "pays d'origine",
      title: (j) => `Options de migration professionnelle pour ${j}`,
      summary: (j, o) =>
        `Selon le rôle « ${j} » et l'origine « ${o} », marchés qui recrutent souvent des compétences proches. Orientation générale, pas un conseil juridique.`,
      countries: [
        {
          country: "Allemagne / UE",
          demand:
            "Demande stable en technique, santé, construction et IT.",
          pathway: "Visa travailleurs qualifiés / Carte bleue UE.",
          notes:
            "Reconnaissance des diplômes et niveau de langue souvent requis.",
        },
        {
          country: "Canada",
          demand:
            "Immigration à points pour les travailleurs qualifiés.",
          pathway: "Express Entry / Programmes provinciaux (PNP).",
          notes:
            "Tests de langue et évaluation des diplômes courants.",
        },
        {
          country: "Australie",
          demand:
            "Listes d'occupations qualifiées influencent l'éligibilité.",
          pathway: "Visa indépendant ou parrainage employeur.",
          notes:
            "Évaluation des skills et points âge/langue comptent.",
        },
        {
          country: "Golfe (EAU, Qatar, Oman)",
          demand:
            "Demande liée aux projets (construction, énergie, santé, tech).",
          pathway: "Visa de travail parrainé par l'employeur.",
          notes:
            "Souvent contractuel ; résidence permanente limitée.",
        },
      ],
      caveats: [
        "Les règles changent ; consultez les sources officielles.",
        "Sanctions ou limites de passeport peuvent bloquer le parcours.",
        "Ce n'est pas un conseil juridique.",
      ],
    },

    /* -------- هندی -------- */
    hi: {
      originFallback: "मूल देश",
      title: (j) => `${j} के लिए कौशल-आधारित प्रवास विकल्प`,
      summary: (j, o) =>
        `भूमिका «${j}» और मूल «${o}» के आधार पर वे बाज़ार जो अक्सर मिलते-जुलते कौशल चाहते हैं। सामान्य मार्गदर्शन — कानूनी सलाह नहीं।`,
      countries: [
        {
          country: "जर्मनी / EU",
          demand:
            "तकनीक, स्वास्थ्य, निर्माण और IT में स्थिर माँग।",
          pathway: "कुशल कार्यकर्ता वीज़ा / EU ब्लू कार्ड।",
          notes:
            "मान्य योग्यता और न्यूनतम भाषा स्तर अक्सर ज़रूरी।",
        },
        {
          country: "कनाडा",
          demand:
            "कुशल कामगारों के लिए पॉइंट-आधारित आव्रजन।",
          pathway: "Express Entry / प्रांतीय (PNP)।",
          notes: "भाषा परीक्षा और क्रेडेंशियल मूल्यांकन आम।",
        },
        {
          country: "ऑस्ट्रेलिया",
          demand:
            "स्किल्ड ऑक्यूपेशन सूची पात्रता तय करती है।",
          pathway: "स्वतंत्र स्किल्ड वीज़ा या नियोक्ता प्रायोजन।",
          notes:
            "स्किल्स असेसमेंट और आयु/भाषा अंक मायने रखते हैं।",
        },
        {
          country: "खाड़ी देश (UAE, कतर, ओमान)",
          demand:
            "निर्माण, ऊर्जा, स्वास्थ्य, टेक में प्रोजेक्ट माँग।",
          pathway: "नियोक्ता-प्रायोजित वर्क वीज़ा।",
          notes:
            "अक्सर अनुबंध आधारित; स्थायी निवास सीमित।",
        },
      ],
      caveats: [
        "नियम बदलते रहते हैं; आधिकारिक स्रोत देखें।",
        "प्रतिबंध या पासपोर्ट सीमाएँ मार्ग रोक सकती हैं।",
        "यह कानूनी सलाह नहीं है।",
      ],
    },

    /* -------- انگلیسی (پیش‌فرض) -------- */
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
          pathway:
            "Express Entry / Provincial Nominee Programs (PNP).",
          notes:
            "Language tests and credential assessment (ECA) are common.",
        },
        {
          country: "Australia",
          demand:
            "Skilled occupation lists strongly influence eligibility.",
          pathway: "Independent skilled visa or employer sponsorship.",
          notes:
            "Skills assessment and points for age/language matter.",
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

  // انتخاب بسته‌ی زبانی مناسب (fallback به انگلیسی).
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

/* ------------------------------------------------------------------ */
/* پارس خروجی AI                                                       */
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
  let jsonStr = text.trim();

  // حذف بلوک‌های ```json ... ```
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();

  // استخراج اولین { ... } معتبر
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

    /* -------- نرمال‌سازی کشورها -------- */
    const countries = (raw.countries || [])
      .map((c) => ({
        country: String(c.country || "").slice(0, 120),
        demand: String(c.demand || "").slice(0, 500),
        pathway: String(c.pathway || "").slice(0, 500),
        notes: String(c.notes || "").slice(0, 500),
      }))
      .filter((c) => c.country && (c.demand || c.pathway))
      .slice(0, 8);

    // حداقل ۲ کشور معتبر مورد نیاز است.
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

/* ------------------------------------------------------------------ */
/* POST — تحلیل گزینه‌های مهاجرت                                        */
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
Experience years: ${parsed.data.experienceYears ?? "n/a"}
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
      }
    }

    /* -------- Fallback به heuristic -------- */
    if (!result) {
      result = heuristicMigration(jobTitle, country, locale);
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
