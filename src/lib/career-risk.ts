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
function defaultAlternatives(
  locale: CareerRiskLocale,
  title: string
): string[] {
  return {
    en: [
      `Hybrid ${title} + AI roles`,
      "Training or supervising automated tools",
      "Roles leaning on interpersonal skills",
    ],
    es: [
      `Roles híbridos ${title} + IA`,
      "Formación o supervisión de herramientas automatizadas",
      "Roles basados en habilidades interpersonales",
    ],
    ar: [
      `أدوار هجينة ${title} + ذكاء اصطناعي`,
      "التدريب أو الإشراف على الأدوات المؤتمتة",
      "أدوار تعتمد على المهارات الشخصية",
    ],
    fa: [
      `نقش‌های ترکیبی ${title} + هوش مصنوعی`,
      "آموزش یا نظارت بر ابزارهای خودکار",
      "نقش‌هایی متکی بر مهارت‌های بین‌فردی",
    ],
    hi: [
      `हाइब्रिड ${title} + AI भूमिकाएँ`,
      "स्वचालित उपकरणों का प्रशिक्षण/पर्यवेक्षण",
      "पारस्परिक कौशल वाली भूमिकाएँ",
    ],
    fr: [
      `Rôles hybrides ${title} + IA`,
      "Formation ou supervision d'outils automatisés",
      "Rôles axés sur les compétences interpersonnelles",
    ],
    de: [
      `Hybride ${title}+KI-Rollen`,
      "Schulung oder Aufsicht automatisierter Tools",
      "Rollen mit Fokus auf zwischenmenschliche Fähigkeiten",
    ],
  }[locale];
}

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

  /* -------- شواهد از کارهای پرخطر -------- */
  for (const task of exposed.slice(0, 2)) {
    const label = taskLabel(task, locale);
    if (locale === "fa") {
      reasons.push(
        `در نقش «${profile.currentRole}»، کار «${label}» با سطح اتوماسیون حدود ${task.automation}٪ مشخص شده و از عوامل اصلی امتیاز ریسک است.`
      );
    } else {
      reasons.push(
        `In «${profile.currentRole}», the task «${label}» has ~${task.automation}% automation exposure and is a primary risk driver.`
      );
    }
  }

  /* -------- شواهد از کارهای مقاوم -------- */
  for (const task of resilient.slice(0, 2)) {
    const label = taskLabel(task, locale);
    if (locale === "fa") {
      reasons.push(
        `نقطه قوت شما: «${label}» به قضاوت انسانی/تعامل/نظم مقرراتی وابسته است (قضاوت ${task.judgment}٪) و کمتر جایگزین‌پذیر است.`
      );
    } else {
      reasons.push(
        `Resilience factor: «${label}» depends on judgment/relationships/regulation (judgment ${task.judgment}%) and is harder to fully automate.`
      );
    }
  }

  /* -------- شواهد از تجربه و سطح -------- */
  if (profile.yearsExperience != null) {
    if (locale === "fa") {
      reasons.push(
        `با ${profile.yearsExperience} سال تجربه و سطح ${profile.seniority}، بخش قضاوت‌محور نقش نسبت به کار junior محافظت نسبی دارد — به شرط مستندسازی نتایج.`
      );
    } else {
      reasons.push(
        `With ${profile.yearsExperience} years and seniority «${profile.seniority}», judgment-heavy work is partially protected versus pure junior task mix — if outcomes are documented.`
      );
    }
  }

  /* -------- شواهد از مهارت‌ها -------- */
  if (profile.skills.length > 0) {
    const sample = profile.skills
      .slice(0, 4)
      .join(locale === "fa" ? "، " : ", ");
    if (locale === "fa") {
      reasons.push(
        `مهارت‌های اعلام‌شده (${sample}) در تحلیل شکاف مهارت و مسیر مقاوم‌سازی لحاظ شده‌اند.`
      );
    } else {
      reasons.push(
        `Declared skills (${sample}) were used to prioritize resilience and gap-closing actions.`
      );
    }
  }

  /* -------- شواهد از اطلاعات ناقص -------- */
  if (profile.uncertainty.length) {
    if (locale === "fa") {
      reasons.push(
        `اطلاعات ناقص (${profile.uncertainty.join("، ")}): تحلیل محافظه‌کارانه است و نباید با ارزیابی تخصصی جایگزین شود.`
      );
    } else {
      reasons.push(
        `Incomplete profile fields (${profile.uncertainty.join(", ")}): analysis is conservative and not a substitute for specialist advice.`
      );
    }
  }

  /* -------- اطمینان از حداقل ۳ دلیل -------- */
  while (reasons.length < 3) {
    reasons.push(
      locale === "fa"
        ? `خانواده شغلی «${profile.roleFamily}» در افق ۵–۱۰ سال با ترکیب متفاوتی از اتوماسیون و قضاوت انسانی روبه‌روست.`
        : `Role family «${profile.roleFamily}» faces a mixed automation/judgment outlook over 5–10 years.`
    );
  }

  const skillsToBuild =
    profile.missingSkills.length > 0
      ? profile.missingSkills.slice(0, 6)
      : defaultSkills(locale);

  const alternatives = defaultAlternatives(locale, profile.currentRole);

  /* -------- خلاصه‌ی شرطی‌شده بر اساس پروفایل (نه یک قالب یکسان) -------- */
  const topExposed = exposed[0] ? taskLabel(exposed[0], locale) : null;
  const topResilient = resilient[0] ? taskLabel(resilient[0], locale) : null;

  let summary: string;
  if (locale === "fa") {
    summary =
      `تحلیل آفلاین برای «${profile.currentRole}»` +
      (place ? ` در ${place}` : "") +
      (profile.specialization
        ? ` (تخصص محتمل: ${profile.specialization})`
        : "") +
      `. ` +
      (topExposed ? `بیشترین فشار اتوماسیون روی «${topExposed}» است. ` : "") +
      (topResilient ? `مقاومت بیشتر در «${topResilient}» دیده می‌شود. ` : "") +
      (profile.yearsExperience != null
        ? `تجربه ${profile.yearsExperience} ساله در امتیاز لحاظ شد. `
        : "") +
      (profile.skills.length
        ? `شکاف‌های پیشنهادی بر اساس مهارت‌های فعلی شما اولویت‌بندی شده‌اند. `
        : "بدون فهرست مهارت، توصیه‌ها کلی‌تر و با اطمینان کمترند. ") +
      `امتیاز ترکیبی ${score}/100 از مدل وظیفه/ابزار به‌دست آمده است — نه یک متن قالبی یکسان برای همه. ` +
      `این تحلیل تخمینی است و جایگزین مشاوره تخصصی یا حقوقی نیست.`;
  } else {
    summary =
      `Offline analysis for «${profile.currentRole}»` +
      (place ? ` in ${place}` : "") +
      (profile.specialization
        ? ` (likely focus: ${profile.specialization})`
        : "") +
      `. ` +
      (topExposed
        ? `Highest automation pressure sits on «${topExposed}». `
        : "") +
      (topResilient
        ? `Stronger resilience appears in «${topResilient}». `
        : "") +
      (profile.yearsExperience != null
        ? `${profile.yearsExperience} years of experience adjusted the score. `
        : "") +
      (profile.skills.length
        ? `Skill-gap priorities reflect your declared toolkit. `
        : "Without listed skills, guidance stays broader and lower-confidence. ") +
      `Composite score ${score}/100 is derived from a task/tool model — not a one-size template. ` +
      `This is an offline estimate and not a substitute for specialist advice.`;
  }

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
