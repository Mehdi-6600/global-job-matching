import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskLocale,
  CareerRiskSource,
  CareerRiskSubScores,
  CareerRiskSuccessResponse,
} from "@/types/career-risk";
import { careerRiskAiOutputSchema } from "@/types/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  resilientTasks,
  taskAutomationExposure,
  humanMoatScore,
  taskLabel,
  toolMaturityFromProfile,
} from "@/lib/career-intelligence/profile";

/* ------------------------------------------------------------------ */
/* Re-exports                                                          */
/* ------------------------------------------------------------------ */

export type { CareerRiskAnalysis, CareerRiskLevel, CareerRiskSource };
export {
  CAREER_RISK_DISCLAIMER_EN,
  CAREER_RISK_DISCLAIMER_FA,
  careerRiskRequestSchema,
} from "@/types/career-risk";

/* ------------------------------------------------------------------ */
/* ابزارهای پایه                                                       */
/* ------------------------------------------------------------------ */

/**
 * بررسی می‌کند که آیا پلن کاربر از نوع پرداختی است یا خیر.
 *
 * پلن‌های پرداختی: `pro`, `business`, `enterprise`.
 * هر مقدار دیگری (شامل `null` و `undefined`) → `free`.
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "business" || p === "enterprise";
}

/**
 * یک عدد را به بازه‌ی ۰ تا ۱۰۰ محدود و به نزدیک‌ترین عدد صحیح گرد می‌کند.
 *
 * اگر عدد نامعتبر باشد (`NaN`, `Infinity`, `-Infinity`)، مقدار پیش‌فرض
 * `50` برگردانده می‌شود که یک امتیاز میانی محافظه‌کارانه است.
 */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * بر اساس امتیاز ریسک، سطح ریسک را تعیین می‌کند:
 *
 * - کمتر از ۳۵ → `low`
 * - بین ۳۵ تا ۶۴ → `medium`
 * - ۶۵ و بالاتر → `high`
 */
export function scoreToRiskLevel(score: number): CareerRiskLevel {
  const s = clampScore(score);
  if (s < 35) return "low";
  if (s < 65) return "medium";
  return "high";
}

/**
 * لوکال درخواست را نرمال‌سازی می‌کند.
 *
 * فقط لوکال‌های پشتیبانی‌شده پذیرفته می‌شوند:
 * `fa`, `ar`, `es`, `fr`, `hi`, `de`.
 * در غیر این صورت → `en`.
 */
export function normalizeCareerLocale(
  raw: string | null | undefined
): CareerRiskLocale {
  const p = String(raw || "en").toLowerCase().slice(0, 2);
  if (
    p === "fa" ||
    p === "ar" ||
    p === "es" ||
    p === "fr" ||
    p === "hi" ||
    p === "de"
  ) {
    return p;
  }
  return "en";
}

/**
 * نام کامل زبان را برای استفاده در پرامپت AI برمی‌گرداند.
 */
export function languageNameForPrompt(locale: CareerRiskLocale): string {
  switch (locale) {
    case "fa":
      return "Persian (Farsi)";
    case "ar":
      return "Arabic";
    case "es":
      return "Spanish";
    case "fr":
      return "French";
    case "hi":
      return "Hindi";
    case "de":
      return "German";
    default:
      return "English";
  }
}

/* ------------------------------------------------------------------ */
/* متن‌های چندزبانه‌ی heuristic                                        */
/* ------------------------------------------------------------------ */

/** نگاشت لوکال به یک رشته‌ی متنی. */
type LocaleCopy = Record<CareerRiskLocale, string>;

/**
 * انتخاب مقدار مناسب از جدول بر اساس لوکال، با fallback به انگلیسی.
 */
function L(locale: CareerRiskLocale, table: LocaleCopy): string {
  return table[locale] || table.en;
}

/** Pick localized template; falls back to en. Interpolate {key} placeholders. */
function T(
  locale: CareerRiskLocale,
  table: Partial<Record<CareerRiskLocale, string>> & { en: string },
  vars: Record<string, string | number> = {}
): string {
  let s = table[locale] || table.en;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}



/** افق زمانی پیش‌فرض به‌ازای هر لوکال. */
const TIME_HORIZON: LocaleCopy = {
  en: "5–10 years",
  es: "5–10 años",
  ar: "٥–١٠ سنوات",
  fa: "۵–۱۰ سال",
  hi: "5–10 वर्ष",
  fr: "5–10 ans",
  de: "5–10 Jahre",
};

/** پیام ارتقا به پلن Pro برای کاربران رایگان. */
const UPGRADE_MSG: LocaleCopy = {
  en: "Upgrade to Pro to unlock alternative role recommendations.",
  es: "Mejora a Pro para desbloquear recomendaciones de roles alternativos.",
  ar: "قم بالترقية إلى Pro لفتح توصيات الأدوار البديلة.",
  fa: "برای مسیرهای جایگزین، به پلن Pro ارتقا دهید.",
  hi: "वैकल्पिक भूमिका सुझाव अनलॉक करने के लिए Pro में अपग्रेड करें।",
  fr: "Passez à Pro pour débloquer les recommandations de rôles alternatifs.",
  de: "Upgrade auf Pro, um alternative Rollenempfehlungen freizuschalten.",
};

/** مهارت‌های پیشنهادی پیش‌فرض به‌ازای هر لوکال. */
function defaultSkills(locale: CareerRiskLocale): string[] {
  return {
    en: ["Digital literacy", "Problem-solving", "Domain specialization"],
    es: [
      "Alfabetización digital",
      "Resolución de problemas",
      "Especialización de dominio",
    ],
    ar: ["محو الأمية الرقمية", "حل المشكلات", "تخصص المجال"],
    fa: ["سواد دیجیتال", "حل مسئله", "تخصص حوزه‌ای"],
    hi: ["डिजिटल साक्षरता", "समस्या समाधान", "क्षेत्र विशेषज्ञता"],
    fr: [
      "Culture numérique",
      "Résolution de problèmes",
      "Spécialisation métier",
    ],
    de: ["Digitale Kompetenz", "Problemlösung", "Fachspezialisierung"],
  }[locale];
}

/** مسیرهای جایگزین پیش‌فرض به‌ازای هر لوکال. */
/** مسیرهای جایگزین وابسته به خانواده شغلی — نه یک جمله یکسان برای همه. */
function defaultAlternatives(
  locale: CareerRiskLocale,
  title: string,
  family?: string
): string[] {
  const f = family || "generic";
  const tables: Record<string, Record<CareerRiskLocale, string[]>> = {
    software_engineering: {
      en: [`Senior ${title} with system ownership`, "Platform / reliability engineering", "Technical product specialist"],
      fa: [`${title} ارشد با مالکیت سیستم`, "مهندسی پلتفرم / قابلیت اطمینان", "متخصص محصول فنی"],
      ar: [`${title} أول مع ملكية النظام`, "هندسة المنصات / الموثوقية", "أخصائي منتج تقني"],
      es: [`${title} senior con ownership de sistema`, "Ingeniería de plataforma / fiabilidad", "Especialista de producto técnico"],
      fr: [`${title} senior avec ownership système`, "Ingénierie plateforme / fiabilité", "Spécialiste produit technique"],
      de: [`Senior-${title} mit Systemverantwortung`, "Platform-/Reliability-Engineering", "Technischer Produktspezialist"],
      hi: [`सिस्टम ओनरशिप वाला सीनियर ${title}`, "प्लेटफ़ॉर्म / विश्वसनीयता इंजीनियरिंग", "तकनीकी उत्पाद विशेषज्ञ"],
    },
    accounting_finance: {
      en: ["FP&A / management accounting", "Controls and compliance analyst", "Finance systems specialist"],
      fa: ["حسابداری مدیریت / FP&A", "تحلیلگر کنترل و انطباق", "متخصص سیستم‌های مالی"],
      ar: ["المحاسبة الإدارية / FP&A", "محلل الرقابة والامتثال", "أخصائي أنظمة مالية"],
      es: ["FP&A / contabilidad de gestión", "Analista de controles y compliance", "Especialista en sistemas financieros"],
      fr: ["FP&A / contrôle de gestion", "Analyste contrôles et conformité", "Spécialiste systèmes finance"],
      de: ["FP&A / Management Accounting", "Controls- und Compliance-Analyst", "Finanzsystem-Spezialist"],
      hi: ["FP&A / प्रबंधन लेखांकन", "नियंत्रण और अनुपालन विश्लेषक", "वित्त सिस्टम विशेषज्ञ"],
    },
    education: {
      en: ["Curriculum / learning design", "Assessment specialist", "EdTech facilitation"],
      fa: ["طراحی برنامه درسی / یادگیری", "متخصص سنجش", "تسهیل‌گری EdTech"],
      ar: ["تصميم المناهج / التعلم", "أخصائي تقييم", "تيسير تقنيات التعليم"],
      es: ["Diseño curricular / aprendizaje", "Especialista en evaluación", "Facilitación EdTech"],
      fr: ["Conception pédagogique", "Spécialiste de l'évaluation", "Facilitation EdTech"],
      de: ["Lehrplan-/Lerndesign", "Assessment-Spezialist", "EdTech-Moderation"],
      hi: ["पाठ्यक्रम / अधिगम डिज़ाइन", "मूल्यांकन विशेषज्ञ", "EdTech सुविधा"],
    },
    healthcare: {
      en: ["Specialist clinical pathway", "Care coordination", "Clinical education"],
      fa: ["مسیر بالینی تخصصی", "هماهنگی مراقبت", "آموزش بالینی"],
      ar: ["مسار سريري متخصص", "تنسيق الرعاية", "التعليم السريري"],
      es: ["Vía clínica especializada", "Coordinación de cuidados", "Educación clínica"],
      fr: ["Parcours clinique spécialisé", "Coordination des soins", "Éducation clinique"],
      de: ["Spezialisierte klinische Laufbahn", "Versorgungskoordination", "Klinische Fortbildung"],
      hi: ["विशेष क्लिनिकल मार्ग", "केयर समन्वय", "क्लिनिकल शिक्षा"],
    },
    generic: {
      en: [`Advanced ${title} specialist`, "Cross-functional coordination roles", "Domain training and quality roles"],
      fa: [`متخصص پیشرفته ${title}`, "نقش‌های هماهنگی بین‌تیمی", "نقش‌های آموزش و کیفیت حوزه"],
      ar: [`أخصائي ${title} متقدم`, "أدوار تنسيق عبر الفرق", "أدوار تدريب وجودة المجال"],
      es: [`Especialista avanzado en ${title}`, "Roles de coordinación transversal", "Roles de formación y calidad"],
      fr: [`Spécialiste ${title} avancé`, "Rôles de coordination transverse", "Formation et qualité métier"],
      de: [`Fortgeschrittener ${title}-Spezialist`, "Übergreifende Koordinationsrollen", "Domain-Training und Qualität"],
      hi: [`उन्नत ${title} विशेषज्ञ`, "क्रॉस-फंक्शनल समन्वय भूमिकाएँ", "डोमेन प्रशिक्षण और गुणवत्ता"],
    },
  };
  const pack = tables[f] || tables.generic;
  return pack[locale] || pack.en;
}


/** خط چشم‌انداز صنعت + مکان به‌ازای هر لوکال. */
function industryOutlookLine


/** خط چشم‌انداز صنعت + مکان به‌ازای هر لوکال. */
function industryOutlookLine(
  locale: CareerRiskLocale,
  industry: string,
  place: string
): string {
  const ind = industry.trim() || "—";
  const loc = place.trim() || "—";
  return L(locale, {
    en: `Industry: ${ind} · Location: ${loc}`,
    es: `Sector: ${ind} · Ubicación: ${loc}`,
    ar: `القطاع: ${ind} · الموقع: ${loc}`,
    fa: `صنعت: ${ind} · مکان: ${loc}`,
    hi: `उद्योग: ${ind} · स्थान: ${loc}`,
    fr: `Secteur : ${ind} · Lieu : ${loc}`,
    de: `Branche: ${ind} · Ort: ${loc}`,
  });
}

/* ------------------------------------------------------------------ */
/* پارس و اعتبارسنجی خروجی AI                                          */
/* ------------------------------------------------------------------ */

/**
 * یک مقدار ناشناخته را به آرایه‌ای از رشته‌های غیرخالی تبدیل می‌کند.
 *
 * - هر آیتم به رشته تبدیل، trim و فیلتر می‌شود.
 * - حداکثر `max` آیتم برگردانده می‌شود.
 */
function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

/**
 * پارس سخت‌گیرانه‌ی زیرامتیازها.
 *
 * اگر هر یک از مقادیر نامعتبر باشد (`NaN`, خارج از بازه، غیرعدد)،
 * `null` برگردانده می‌شود.
 */
export function parseSubScoresStrict(
  raw: unknown
): CareerRiskSubScores | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "taskAutomation",
    "toolMaturity",
    "marketAdoption",
    "agenticExposure",
  ] as const;

  const out: Partial<CareerRiskSubScores> = {};
  for (const k of keys) {
    const n = Number(o[k]);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    out[k] = Math.round(n);
  }
  return out as CareerRiskSubScores;
}

/**
 * پارس نرم زیرامتیازها: فقط مقادیر معتبر را می‌پذیرد و
 * برای بقیه از مقدار پیش‌فرض استفاده می‌کند.
 */
function parseSubScoresSoft(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;

  const one = (v: unknown, fallback: number): number => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
    return Math.round(n);
  };

  return {
    taskAutomation: one(o.taskAutomation, 45),
    toolMaturity: one(o.toolMaturity, 45),
    marketAdoption: one(o.marketAdoption, 40),
    agenticExposure: one(o.agenticExposure, 35),
  };
}

/**
 * محاسبه‌ی امتیاز ترکیبی از زیرامتیازها.
 *
 * فرمول:
 * ```
 * base = taskAutomation × (0.45 + 0.3 × toolMaturity/100 + 0.25 × marketAdoption/100)
 * score = clampScore(base + 0.1 × agenticExposure)
 * ```
 *
 * وزن اصلی روی `taskAutomation` است و `toolMaturity` و `marketAdoption`
 * آن را تعدیل می‌کنند. `agenticExposure` وزن کمی (۰.۱) دارد.
 */
export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
}

/**
 * هماهنگ‌سازی امتیاز ریسک با زیرامتیازها.
 *
 * - اگر اختلاف `> 30` → مدل ناسازگار است؛ امتیاز ترکیبی ترجیح داده می‌شود.
 * - اگر اختلاف `> 15` → Blend با وزن `0.4` برای raw و `0.6` برای composite.
 * - در غیر این صورت → raw حفظ می‌شود.
 */
export function reconcileScoreWithSubScores(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  const composite = compositeFromSubScores(subScores);
  const raw = clampScore(riskScore);
  const gap = Math.abs(raw - composite);

  if (gap > 30) return composite;
  if (gap > 15) return clampScore(Math.round(raw * 0.4 + composite * 0.6));
  return raw;
}

/**
 * فاصله‌ی امتیاز AI از امتیاز ترکیبی زیرامتیازها (۰ = کاملاً هماهنگ).
 */
export function scoreSubScoreGap(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  return Math.abs(clampScore(riskScore) - compositeFromSubScores(subScores));
}

/**
 * پارس خروجی JSON مدل AI.
 *
 * استراتژی:
 * 1. حذف بلوک‌های ```json ... ```.
 * 2. استخراج اولین `{ ... }` معتبر.
 * 3. `JSON.parse`.
 * 4. اعتبارسنجی سخت‌گیرانه با Zod (`careerRiskAiOutputSchema.safeParse`).
 * 5. اگر Zod شکست خورد → استفاده از مقادیر خام `obj`.
 * 6. استخراج `summary` (حداقل ۱۰ کاراکتر).
 * 7. استخراج `riskScore` (باید عددی باشد).
 * 8. پارس زیرامتیازها (اول strict، سپس soft).
 * 9. هماهنگ‌سازی امتیاز با `reconcileScoreWithSubScores`.
 * 10. استخراج `reasons` و `skillsToBuild`.
 * 11. شرط رد: اگر `reasons` و `skillsToBuild` هر دو خالی باشند → `null`.
 * 12. تنظیم `confidence` و `confidenceSource`.
 * 13. شرط رد دوم: اگر دلایل معنادار (`≥ 24` کاراکتر) صفر و
 *     `skillsToBuild < 2` باشد → `null`.
 * 14. ساخت شیء نهایی با `source: "ai"`.
 */
export function parseRiskJson(
  text: string,
  userJobTitle: string
): CareerRiskAnalysis | null {
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
    const raw = JSON.parse(jsonStr.slice(start, end + 1)) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    /* -------- اعتبارسنجی سخت‌گیرانه -------- */
    const strict = careerRiskAiOutputSchema.safeParse(raw);

    /* -------- استخراج summary -------- */
    const summary = String(
      strict.success ? strict.data.summary : obj.summary || ""
    ).trim();
    if (summary.length < 10) return null;

    /* -------- استخراج امتیاز -------- */
    const rawScore = Number(
      strict.success ? strict.data.riskScore : obj.riskScore
    );
    if (!Number.isFinite(rawScore)) return null;

    /* -------- زیرامتیازها -------- */
    const subScores =
      parseSubScoresStrict(
        strict.success ? strict.data.subScores : obj.subScores
      ) || parseSubScoresSoft(obj.subScores);

    /* -------- هماهنگ‌سازی امتیاز -------- */
    let riskScore = clampScore(rawScore);
    if (subScores) {
      riskScore = reconcileScoreWithSubScores(riskScore, subScores);
    }

    /* -------- دلایل و مهارت‌ها -------- */
    const reasons = asStringArray(
      strict.success ? strict.data.reasons : obj.reasons,
      10
    );
    const skillsToBuild = asStringArray(
      strict.success ? strict.data.skillsToBuild : obj.skillsToBuild,
      12
    );

    if (reasons.length === 0 && skillsToBuild.length === 0) {
      return null;
    }

    /* -------- اعتماد + سازگاری امتیاز -------- */
    const confidenceRaw = Number(
      strict.success ? strict.data.confidence : obj.confidence
    );

    let confidence = Number.isFinite(confidenceRaw)
      ? clampScore(confidenceRaw)
      : 55;
    let confidenceSource: "model" | "repaired" = "model";

    if (!subScores) {
      confidence = Math.min(confidence, 45);
      confidenceSource = "repaired";
    } else {
      const gapBefore = scoreSubScoreGap(clampScore(rawScore), subScores);
      if (gapBefore > 15) {
        confidence = Math.min(confidence, gapBefore > 30 ? 40 : 55);
        confidenceSource = "repaired";
      }
    }

    const meaningfulReasons = reasons.filter((r) => r.length >= 24);
    if (meaningfulReasons.length === 0 && skillsToBuild.length < 2) {
      return null;
    }

    /* -------- افق زمانی -------- */
    const timeHorizon = String(
      (strict.success ? strict.data.timeHorizon : obj.timeHorizon) ||
        "5–10 years"
    ).slice(0, 40);

    return {
      jobTitle: userJobTitle.trim().slice(0, 120),
      riskScore,
      riskLevel: scoreToRiskLevel(riskScore),
      summary: summary.slice(0, 2500),
      reasons:
        meaningfulReasons.length > 0
          ? meaningfulReasons.slice(0, 8)
          : reasons.length > 0
            ? reasons
            : ["Analysis based on role characteristics and provided context."],
      skillsToBuild:
        skillsToBuild.length > 0
          ? skillsToBuild
          : ["Domain specialization", "Digital literacy"],
      alternatives: asStringArray(
        strict.success ? strict.data.alternatives : obj.alternatives,
        10
      ),
      source: "ai",
      subScores,
      timeHorizon,
      confidence,
      confidenceSource,
      industryOutlook: (() => {
        const v = strict.success
          ? strict.data.industryOutlook
          : obj.industryOutlook;
        return v ? String(v).slice(0, 500) : undefined;
      })(),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* تحلیل heuristic (آفلاین)                                            */
/* ------------------------------------------------------------------ */

/**
 * تحلیل heuristic ریسک شغلی.
 *
 * این تابع زمانی استفاده می‌شود که:
 * - سهمیه‌ی AI تمام شده باشد.
 * - خطای زیرساختی رخ داده باشد.
 * - خروجی AI نامعتبر باشد.
 *
 * خروجی آن کاملاً آفلاین و بر اساس قواعد است.
 */
export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string,
  extra?: {
    industry?: string;
    experienceYears?: number;
    country?: string;
    location?: string;
    education?: string;
    locale?: string;
    targetRole?: string;
    careerGoal?: string;
    languages?: string;
    responsibilities?: string;
  }
): CareerRiskAnalysis {
  const locale = normalizeCareerLocale(extra?.locale);

  const profile = buildCareerProfile({
    jobTitle,
    skills,
    industry: extra?.industry,
    experienceYears: extra?.experienceYears,
    country: extra?.country,
    location: extra?.location,
    education: extra?.education,
    locale,
    targetRole: extra?.targetRole,
    careerGoal: extra?.careerGoal,
    languages: extra?.languages,
    responsibilities: extra?.responsibilities,
  });

  const auto = taskAutomationExposure(profile);
  const moat = humanMoatScore(profile);
  const exposed = highAutomationTasks(profile);
  const resilient = resilientTasks(profile);

  /* -------- محاسبه‌ی زیرامتیازها از شواهد پروفایل (قطعی) -------- */
  let taskAutomation = auto;
  let toolMaturity = toolMaturityFromProfile(profile);
  let marketAdoption = 40 + (profile.country || profile.location ? 8 : 0);
  let agenticExposure = Math.round(auto * 0.55 + (100 - moat) * 0.25);

  /* -------- تعدیلات بر اساس خانواده‌ی شغلی -------- */
  if (profile.roleFamily === "software_engineering") {
    toolMaturity = Math.min(95, toolMaturity + 20);
    agenticExposure = Math.min(90, agenticExposure + 12);
  }
  if (profile.roleFamily === "healthcare" || profile.roleFamily === "trades") {
    taskAutomation = Math.max(15, taskAutomation - 15);
    agenticExposure = Math.max(15, agenticExposure - 12);
  }
  if (profile.roleFamily === "operations_clerical") {
    taskAutomation = Math.min(92, taskAutomation + 15);
  }
  if (profile.seniority === "senior" || profile.seniority === "lead") {
    taskAutomation = Math.max(10, taskAutomation - 6);
  }
  if ((profile.yearsExperience ?? 0) >= 10) {
    taskAutomation = Math.max(10, taskAutomation - 4);
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };

  const score = compositeFromSubScores(subScores);

  const place = [profile.location, profile.country]
    .filter(Boolean)
    .join(locale === "fa" || locale === "ar" ? "، " : ", ");

  const reasons: string[] = [];
  const sep = locale === "fa" || locale === "ar" ? "، " : ", ";

  /* -------- شواهد از کارهای پرخطر -------- */
  for (const task of exposed.slice(0, 2)) {
    const label = taskLabel(task, locale);
    reasons.push(
      T(
        locale,
        {
          en: `In «{role}», the task «{label}» has ~{pct}% automation exposure and is a primary risk driver.`,
          fa: `در نقش «{role}»، کار «{label}» با سطح اتوماسیون حدود {pct}٪ از عوامل اصلی امتیاز ریسک است.`,
          ar: `في دور «{role}»، المهمة «{label}» تعرضها للأتمتة حوالي {pct}% وهي محرك رئيسي للمخاطر.`,
          es: `En «{role}», la tarea «{label}» tiene ~{pct}% de exposición a automatización y es un factor principal de riesgo.`,
          fr: `Dans «{role}», la tâche «{label}» a ~{pct}% d'exposition à l'automatisation et est un facteur de risque majeur.`,
          de: `In «{role}» weist die Aufgabe «{label}» ~{pct}% Automatisierungsrisiko auf und ist ein Haupttreiber.`,
          hi: `«{role}» में कार्य «{label}» ~{pct}% स्वचालन जोखिम वाला है और मुख्य जोखिम कारक है।`,
        },
        { role: profile.currentRole, label, pct: task.automation }
      )
    );
  }

  for (const task of resilient.slice(0, 2)) {
    const label = taskLabel(task, locale);
    reasons.push(
      T(
        locale,
        {
          en: `Resilience factor: «{label}» depends on judgment/relationships/regulation (judgment {pct}%) and is harder to fully automate.`,
          fa: `نقطه قوت: «{label}» به قضاوت انسانی/تعامل/مقررات وابسته است (قضاوت {pct}٪) و کمتر جایگزین‌پذیر است.`,
          ar: `عامل مرونة: «{label}» يعتمد على الحكم/العلاقات/التنظيم (حكم {pct}%) ويصعب أتمتته بالكامل.`,
          es: `Factor de resiliencia: «{label}» depende de juicio/relaciones/regulación (juicio {pct}%) y es más difícil de automatizar.`,
          fr: `Facteur de résilience : «{label}» dépend du jugement/relations/réglementation (jugement {pct}%) et est plus dur à automatiser.`,
          de: `Resilienzfaktor: «{label}» hängt von Urteil/Beziehungen/Regeln ab (Urteil {pct}%) und ist schwer voll zu automatisieren.`,
          hi: `लचीलापन: «{label}» निर्णय/संबंध/नियमों पर निर्भर है (निर्णय {pct}%) और पूरी तरह स्वचालित करना कठिन है।`,
        },
        { label, pct: task.judgment }
      )
    );
  }

  if (profile.yearsExperience != null) {
    reasons.push(
      T(
        locale,
        {
          en: `With {years} years and seniority «{seniority}», judgment-heavy work is partially protected versus pure junior task mix — if outcomes are documented.`,
          fa: `با {years} سال تجربه و سطح {seniority}، بخش قضاوت‌محور نقش نسبت به کار junior محافظت نسبی دارد — به شرط مستندسازی نتایج.`,
          ar: `مع {years} سنوات ومستوى {seniority}، العمل المعتمد على الحكم محمي نسبيًا مقارنة بالمبتدئين — بشرط توثيق النتائج.`,
          es: `Con {years} años y nivel «{seniority}», el trabajo de juicio está parcialmente protegido frente a un perfil junior — si se documentan resultados.`,
          fr: `Avec {years} ans et le niveau «{seniority}», le travail de jugement est partiellement protégé par rapport à un profil junior — si les résultats sont documentés.`,
          de: `Mit {years} Jahren und Seniorität «{seniority}» ist urteilsintensives Arbeiten gegenüber rein junioren Aufgaben teilweise geschützt — wenn Ergebnisse dokumentiert sind.`,
          hi: `{years} वर्ष और स्तर «{seniority}» के साथ, निर्णय-आधारित कार्य जूनियर मिश्रण की तुलना में आंशिक रूप से सुरक्षित है — यदि परिणाम दर्ज हों।`,
        },
        {
          years: profile.yearsExperience,
          seniority: profile.seniority,
        }
      )
    );
  }

  if (profile.skills.length > 0) {
    const sample = profile.skills.slice(0, 4).join(sep);
    reasons.push(
      T(
        locale,
        {
          en: `Declared skills ({sample}) were used to prioritize resilience and gap-closing actions.`,
          fa: `مهارت‌های اعلام‌شده ({sample}) در اولویت‌بندی مقاوم‌سازی و بستن شکاف لحاظ شده‌اند.`,
          ar: `المهارات المعلنة ({sample}) استُخدمت لتحديد أولويات المرونة وسد الفجوات.`,
          es: `Las habilidades declaradas ({sample}) priorizaron resiliencia y cierre de brechas.`,
          fr: `Les compétences déclarées ({sample}) ont priorisé résilience et comblement des écarts.`,
          de: `Angegebene Skills ({sample}) priorisieren Resilienz und Lückenschluss.`,
          hi: `घोषित कौशल ({sample}) लचीलापन और अंतराल बंद करने की प्राथमिकता में उपयोग हुए।`,
        },
        { sample }
      )
    );
  }

  if (profile.uncertainty.length) {
    reasons.push(
      T(
        locale,
        {
          en: `Incomplete fields ({u}): analysis is conservative and not a substitute for specialist advice.`,
          fa: `اطلاعات ناقص ({u}): تحلیل محافظه‌کارانه است و جایگزین مشاوره تخصصی نیست.`,
          ar: `حقول ناقصة ({u}): التحليل محافظ وليس بديلاً عن استشارة متخصصة.`,
          es: `Campos incompletos ({u}): el análisis es conservador y no sustituye asesoría especializada.`,
          fr: `Champs incomplets ({u}) : analyse conservatrice, pas un substitut à un conseil spécialisé.`,
          de: `Unvollständige Felder ({u}): Analyse ist konservativ und kein Ersatz für Fachberatung.`,
          hi: `अधूरे फ़ील्ड ({u}): विश्लेषण सतर्क है और विशेषज्ञ सलाह का विकल्प नहीं।`,
        },
        { u: profile.uncertainty.join(sep) }
      )
    );
  }

  if (profile.targetRole && profile.targetRole !== profile.currentRole) {
    const sk = profile.skills.slice(0, 3).join(locale === "fa" || locale === "ar" ? "، " : ", ") || "—";
    const gaps = profile.missingSkills.slice(0, 3).join(locale === "fa" || locale === "ar" ? "، " : ", ") || "—";
    reasons.push(
      T(
        locale,
        {
          en: `Career transition «{from}» → «{to}»: current skills ({sk}) are transferable; target gaps ({gaps}) should drive the 90-day plan.`,
          fa: `انتقال شغلی از «{from}» به «{to}»: مهارت‌های فعلی ({sk}) قابل انتقال‌اند؛ شکاف‌های هدف ({gaps}) باید اولویت یادگیری ۹۰روزه باشند.`,
          ar: `الانتقال من «{from}» إلى «{to}»: المهارات الحالية ({sk}) قابلة للنقل؛ فجوات الهدف ({gaps}) تقود خطة الـ90 يومًا.`,
          es: `Transición de «{from}» a «{to}»: skills actuales ({sk}) son transferibles; brechas ({gaps}) priorizan el plan de 90 días.`,
          fr: `Transition de «{from}» vers «{to}» : compétences ({sk}) transférables ; écarts ({gaps}) guident le plan 90 jours.`,
          de: `Übergang von «{from}» zu «{to}»: Skills ({sk}) sind transferierbar; Lücken ({gaps}) steuern den 90-Tage-Plan.`,
          hi: `«{from}» → «{to}» संक्रमण: कौशल ({sk}) हस्तांतरणीय; अंतराल ({gaps}) 90-दिन योजना चलाएँ।`,
        },
        { from: profile.currentRole, to: profile.targetRole, sk, gaps }
      )
    );
  }

  if (profile.responsibilities.length > 0) {
    const r0 = profile.responsibilities[0].slice(0, 80);
    reasons.push(
      T(
        locale,
        {
          en: `Based on stated responsibility «{r}», automation/judgment mix was personalized — not title-only.`,
          fa: `بر اساس مسئولیت «{r}»، ترکیب اتوماسیون/قضاوت شخصی‌سازی شده — نه فقط عنوان شغلی.`,
          ar: `بناءً على المسؤولية «{r}»، تم تخصيص مزيج الأتمتة/الحكم — وليس العنوان فقط.`,
          es: `Según la responsabilidad «{r}», el mix automatización/juicio se personalizó — no solo el título.`,
          fr: `D'après la responsabilité «{r}», le mix automatisation/jugement a été personnalisé — pas le titre seul.`,
          de: `Laut Verantwortung «{r}» wurde Automatisierung/Urteil personalisiert — nicht nur der Titel.`,
          hi: `ज़िम्मेदारी «{r}» के आधार पर स्वचालन/निर्णय व्यक्तिगत — केवल शीर्षक नहीं।`,
        },
        { r: r0 }
      )
    );
  }

    while (reasons.length < 3) {
    reasons.push(
      T(
        locale,
        {
          en: `Offline estimate for «{role}» — add skills, experience, and responsibilities for a sharper score.`,
          fa: `تخمین آفلاین برای «{role}» — با افزودن مهارت، تجربه و مسئولیت‌ها امتیاز دقیق‌تر می‌شود.`,
          ar: `تقدير دون اتصال لـ «{role}» — أضف المهارات والخبرة والمسؤوليات لنتيجة أدق.`,
          es: `Estimación offline para «{role}» — añade skills, experiencia y responsabilidades para mayor precisión.`,
          fr: `Estimation hors-ligne pour «{role}» — ajoutez compétences, expérience et responsabilités pour plus de précision.`,
          de: `Offline-Schätzung für «{role}» — Skills, Erfahrung und Verantwortlichkeiten verbessern die Genauigkeit.`,
          hi: `«{role}» के लिए ऑफ़लाइन अनुमान — कौशल, अनुभव और ज़िम्मेदारियाँ जोड़ें।`,
        },
        { role: profile.currentRole }
      )
    );
  }

  const skillsToBuild =
    profile.missingSkills.length > 0
      ? profile.missingSkills
      : defaultSkills(locale);

  const alternatives = defaultAlternatives(locale, profile.currentRole, profile.roleFamily);

  const topExposed = exposed[0] ? taskLabel(exposed[0], locale) : null;
  const topResilient = resilient[0] ? taskLabel(resilient[0], locale) : null;

  let summary = T(
    locale,
    {
      en: `Offline analysis for «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}Composite score {score}/100 comes from a task/tool model — not a one-size template. This is an offline estimate, not specialist advice.`,
      fa: `تحلیل آفلاین برای «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}امتیاز ترکیبی {score}/100 از مدل وظیفه/ابزار است — نه یک قالب یکسان. این تخمین آفلاین است و جایگزین مشاوره تخصصی نیست.`,
      ar: `تحليل دون اتصال لـ «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}الدرجة المركبة {score}/100 من نموذج المهام/الأدوات — وليست قالبًا واحدًا. هذا تقدير دون اتصال وليس استشارة متخصصة.`,
      es: `Análisis offline de «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}Puntuación {score}/100 del modelo tarea/herramienta — no una plantilla única. Estimación offline, no asesoría especializada.`,
      fr: `Analyse hors-ligne pour «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}Score {score}/100 issu du modèle tâche/outil — pas un modèle unique. Estimation hors-ligne, pas un conseil spécialisé.`,
      de: `Offline-Analyse für «{role}»{place}{spec}. {exposed}{resilient}{years}{skills}Gesamtwert {score}/100 aus Aufgaben-/Tool-Modell — keine Einheitsvorlage. Offline-Schätzung, kein Fachgutachten.`,
      hi: `«{role}» का ऑफ़लाइन विश्लेषण{place}{spec}. {exposed}{resilient}{years}{skills}संयुक्त स्कोर {score}/100 कार्य/टूल मॉडल से — एक ही टेम्पलेट नहीं। यह ऑफ़लाइन अनुमान है, विशेषज्ञ सलाह नहीं।`,
    },
    {
      role: profile.currentRole,
      place: place
        ? T(
            locale,
            {
              en: ` in {p}`,
              fa: ` در {p}`,
              ar: ` في {p}`,
              es: ` en {p}`,
              fr: ` à {p}`,
              de: ` in {p}`,
              hi: ` में {p}`,
            },
            { p: place }
          )
        : "",
      spec: profile.specialization
        ? T(
            locale,
            {
              en: ` (focus: {s})`,
              fa: ` (تخصص محتمل: {s})`,
              ar: ` (تخصص محتمل: {s})`,
              es: ` (enfoque: {s})`,
              fr: ` (focus : {s})`,
              de: ` (Fokus: {s})`,
              hi: ` (फोकस: {s})`,
            },
            { s: profile.specialization }
          )
        : "",
      exposed: topExposed
        ? T(
            locale,
            {
              en: `Highest automation pressure on «{t}». `,
              fa: `بیشترین فشار اتوماسیون روی «{t}». `,
              ar: `أعلى ضغط أتمتة على «{t}». `,
              es: `Mayor presión de automatización en «{t}». `,
              fr: `Plus forte pression d'automatisation sur «{t}». `,
              de: `Höchster Automatisierungsdruck auf «{t}». `,
              hi: `सबसे अधिक स्वचालन दबाव «{t}» पर। `,
            },
            { t: topExposed }
          )
        : "",
      resilient: topResilient
        ? T(
            locale,
            {
              en: `Stronger resilience in «{t}». `,
              fa: `مقاومت بیشتر در «{t}». `,
              ar: `مرونة أقوى في «{t}». `,
              es: `Mayor resiliencia en «{t}». `,
              fr: `Plus de résilience sur «{t}». `,
              de: `Stärkere Resilienz bei «{t}». `,
              hi: `«{t}» में अधिक लचीलापन। `,
            },
            { t: topResilient }
          )
        : "",
      years:
        profile.yearsExperience != null
          ? T(
              locale,
              {
                en: `{y} years of experience adjusted the score. `,
                fa: `تجربه {y} ساله در امتیاز لحاظ شد. `,
                ar: `أثرت {y} سنوات خبرة على الدرجة. `,
                es: `{y} años de experiencia ajustaron la puntuación. `,
                fr: `{y} ans d'expérience ont ajusté le score. `,
                de: `{y} Jahre Erfahrung flossen in den Score ein. `,
                hi: `{y} वर्ष के अनुभव ने स्कोर समायोजित किया। `,
              },
              { y: profile.yearsExperience }
            )
          : "",
      skills: profile.skills.length
        ? T(
            locale,
            {
              en: `Skill-gap priorities reflect your declared toolkit. `,
              fa: `شکاف‌های پیشنهادی بر اساس مهارت‌های فعلی شما اولویت‌بندی شده‌اند. `,
              ar: `أولويات فجوات المهارات تعكس أدواتك المعلنة. `,
              es: `Las brechas de skills reflejan tu kit declarado. `,
              fr: `Les écarts de compétences reflètent votre stack déclarée. `,
              de: `Skill-Lücken spiegeln Ihren angegebenen Stack wider. `,
              hi: `कौशल अंतराल आपकी घोषित क्षमताओं को दर्शाते हैं। `,
            },
            {}
          )
        : T(
            locale,
            {
              en: `Without listed skills, guidance stays broader and lower-confidence. `,
              fa: `بدون فهرست مهارت، توصیه‌ها کلی‌تر و با اطمینان کمترند. `,
              ar: `بدون مهارات مدرجة، الإرشاد أوسع وبثقة أقل. `,
              es: `Sin skills listados, la guía es más general y de menor confianza. `,
              fr: `Sans compétences listées, les conseils restent plus larges et moins confiants. `,
              de: `Ohne gelistete Skills bleibt die Beratung breiter und unsicherer. `,
              hi: `बिना सूचीबद्ध कौशल के मार्गदर्शन व्यापक और कम विश्वसनीय है। `,
            },
            {}
          ),
      score,
    }
  );

    return {
    jobTitle: profile.currentRole.slice(0, 120),
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary: summary.slice(0, 2500),
    reasons: Array.from(new Set(reasons)).slice(0, 8),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: L(locale, TIME_HORIZON),
    confidence: Math.min(
      62,
      40 + Math.round(profile.profileCompleteness * 0.25)
    ),
    confidenceSource: "offline_estimate",
    industryOutlook: industryOutlookLine(
      locale,
      profile.industry || "",
      place
    ),
  };
}

/* ------------------------------------------------------------------ */
/* پاسخ نهایی موفقیت                                                   */
/* ------------------------------------------------------------------ */

/**
 * ساخت پاسخ نهایی موفقیت.
 *
 * - امتیاز و سطح ریسک را نرمال می‌کند.
 * - مسیرهای جایگزین را فقط برای کاربران پرداختی آزاد می‌کند.
 * - برای کاربران رایگان پیام ارتقا اضافه می‌کند.
 * - `sharePath` را در صورت وجود `shareToken` می‌سازد.
 */
export function toSuccessResponse(params: {
  analysis: CareerRiskAnalysis;
  paid: boolean;
  assessmentId?: string;
  shareToken?: string;
  locale?: string;
}): CareerRiskSuccessResponse {
  const locale = normalizeCareerLocale(params.locale);
  const riskScore = clampScore(params.analysis.riskScore);
  const riskLevel = scoreToRiskLevel(riskScore);

  // مسیرهای جایگزین فقط برای کاربران پرداختی نمایش داده می‌شوند.
  const alternatives = params.paid ? params.analysis.alternatives : [];

  const analysis: CareerRiskAnalysis = {
    ...params.analysis,
    riskScore,
    riskLevel,
    alternatives,
  };

  return {
    success: true,
    analysis,
    paid: params.paid,
    alternativesLocked: !params.paid,
    message: params.paid ? undefined : L(locale, UPGRADE_MSG),
    assessmentId: params.assessmentId,
    shareToken: params.shareToken,
    sharePath: params.shareToken
      ? `/career-risk/share/${params.shareToken}`
      : undefined,
    jobTitle: analysis.jobTitle,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    summary: analysis.summary,
    reasons: analysis.reasons,
    skillsToBuild: analysis.skillsToBuild,
    alternatives,
    source: analysis.source,
  };
}
