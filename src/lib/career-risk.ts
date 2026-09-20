import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskLocale,
  CareerRiskSource,
  CareerRiskSubScores,
  CareerRiskSuccessResponse,
} from "@/types/career-risk";
import { careerRiskAiOutputSchema } from "@/types/career-risk";
import { runCareerRiskEngine } from "@/lib/career-intelligence/career-risk-engine";

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

/* ------------------------------------------------------------------ */
/* پارس و اعتبارسنجی خروجی AI                                          */
/* ------------------------------------------------------------------ */

/**
 * یک مقدار ناشناخته را به آرایه‌ای از رشته‌های غیرخالی تبدیل می‌کند.
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
 * پارس نرم زیرامتیازها: فقط مقادیر معتبر را می‌پذیرد.
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
 */
export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
}

/**
 * هماهنگ‌سازی امتیاز ریسک با زیرامتیازها.
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
 * فاصله‌ی امتیاز AI از امتیاز ترکیبی زیرامتیازها.
 */
export function scoreSubScoreGap(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  return Math.abs(clampScore(riskScore) - compositeFromSubScores(subScores));
}

/**
 * پارس خروجی JSON مدل AI.
 */
export function parseRiskJson(
  text: string,
  userJobTitle: string
): CareerRiskAnalysis | null {
  if (!text || typeof text !== "string") return null;

  let jsonStr = text.trim();

  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();

  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(jsonStr.slice(start, end + 1)) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    const strict = careerRiskAiOutputSchema.safeParse(raw);

    const summary = String(
      strict.success ? strict.data.summary : obj.summary || ""
    ).trim();
    if (summary.length < 10) return null;

    const rawScore = Number(
      strict.success ? strict.data.riskScore : obj.riskScore
    );
    if (!Number.isFinite(rawScore)) return null;

    const subScores =
      parseSubScoresStrict(
        strict.success ? strict.data.subScores : obj.subScores
      ) || parseSubScoresSoft(obj.subScores);

    let riskScore = clampScore(rawScore);
    if (subScores) {
      riskScore = reconcileScoreWithSubScores(riskScore, subScores);
    }

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
 * Heuristic career risk analysis.
 *
 * Delegates to the Phase-2 engine (`career-risk-engine.ts`), which uses
 * the normalized profile + narrative composer for natural, locale-aware
 * output. The signature is intentionally identical so all existing
 * callers keep working unchanged.
 *
 * When `extra` omits a field, the engine treats it as null — no
 * defaults are invented.
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
  return runCareerRiskEngine({
    jobTitle,
    skills,
    industry: extra?.industry ?? null,
    experienceYears: extra?.experienceYears ?? null,
    country: extra?.country ?? null,
    location: extra?.location ?? null,
    education: extra?.education ?? null,
    locale: extra?.locale ?? null,
    targetRole: extra?.targetRole ?? null,
    careerGoal: extra?.careerGoal ?? null,
    languages: extra?.languages ?? null,
    responsibilities: extra?.responsibilities ?? null,
  });
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
