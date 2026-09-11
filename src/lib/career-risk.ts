import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskLocale,
  CareerRiskSource,
  CareerRiskSubScores,
  CareerRiskSuccessResponse,
} from "@/types/career-risk";
import { careerRiskAiOutputSchema } from "@/types/career-risk";

export type { CareerRiskAnalysis, CareerRiskLevel, CareerRiskSource };
export {
  CAREER_RISK_DISCLAIMER_EN,
  CAREER_RISK_DISCLAIMER_FA,
  careerRiskRequestSchema,
} from "@/types/career-risk";

export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "business" || p === "enterprise";
}

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreToRiskLevel(score: number): CareerRiskLevel {
  const s = clampScore(score);
  if (s < 35) return "low";
  if (s < 65) return "medium";
  return "high";
}

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

function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

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

/** Soft parse: fill gaps only when individual values are valid */
function parseSubScoresSoft(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const one = (v: unknown, fallback: number) => {
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

export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
}

export function reconcileScoreWithSubScores(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  const composite = compositeFromSubScores(subScores);
  const raw = clampScore(riskScore);
  if (Math.abs(raw - composite) > 35) return composite;
  return raw;
}

/**
 * Accept AI JSON if we have a usable summary + score.
 * Prefer strict Zod; fall back to soft parse so free models still count as "online".
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

    let subScores =
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
      // Too empty to treat as real AI analysis
      return null;
    }

    const confidenceRaw = Number(
      strict.success ? strict.data.confidence : obj.confidence
    );
    const confidence = Number.isFinite(confidenceRaw)
      ? clampScore(confidenceRaw)
      : 60;

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
        reasons.length > 0
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

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

type RoleBucket =
  | "care"
  | "trades"
  | "architecture"
  | "tech"
  | "frontend"
  | "finance"
  | "clerical"
  | "education"
  | "generic";

function detectRoleBucket(title: string, industry: string): RoleBucket {
  const blob = `${normalizeTitle(title)} ${normalizeTitle(industry)}`;
  if (
    includesAny(blob, [
      "physio",
      "physiotherapist",
      "nurse",
      "doctor",
      "physician",
      "فیزیوتراپ",
      "پزشک",
      "پرستار",
      "دکتر",
    ])
  )
    return "care";
  if (
    includesAny(blob, [
      "architect",
      "معمار",
      "معماری",
      "architekt",
      "architecte",
    ])
  )
    return "architecture";
  if (
    includesAny(blob, [
      "electrician",
      "plumber",
      "mechanic",
      "chef",
      "برقکار",
      "مکانیک",
    ])
  )
    return "trades";
  if (includesAny(blob, ["teacher", "معلم", "استاد", "lehrer"]))
    return "education";
  if (
    includesAny(blob, [
      "data entry",
      "cashier",
      "clerk",
      "منشی",
      "صندوقدار",
    ])
  )
    return "clerical";
  if (includesAny(blob, ["frontend", "front-end", "فرانت"])) return "frontend";
  if (
    includesAny(blob, [
      "developer",
      "engineer",
      "software",
      "برنامه نویس",
      "توسعه دهنده",
    ])
  )
    return "tech";
  if (includesAny(blob, ["accountant", "حسابدار"])) return "finance";
  return "generic";
}

function locationPressure(
  country?: string,
  location?: string
): { delta: number; noteEn: string; noteFa: string } {
  const blob = `${country || ""} ${location || ""}`.toLowerCase();
  if (!blob.trim()) return { delta: 0, noteEn: "", noteFa: "" };
  if (
    includesAny(blob, [
      "berlin",
      "london",
      "singapore",
      "san francisco",
      "bangalore",
    ])
  ) {
    return {
      delta: 6,
      noteEn: `In ${location || country}, competitive digital adoption can raise tool pressure faster than average.`,
      noteFa: `در ${location || country} پذیرش ابزارهای دیجیتال می‌تواند فشار اتوماسیون را بالاتر ببرد.`,
    };
  }
  if (
    includesAny(blob, ["iran", "tehran", "تهران", "ایران", "india", "egypt"])
  ) {
    return {
      delta: -4,
      noteEn: `Local market structure in ${location || country} still relies heavily on in-person networks for many roles.`,
      noteFa: `بازار محلی در ${location || country} برای بسیاری از مشاغل همچنان به حضور فیزیکی و شبکه حرفه‌ای وابسته است.`,
    };
  }
  return {
    delta: 0,
    noteEn: `Location (${location || country}) can shift demand even when global automation trends are similar.`,
    noteFa: `مکان (${location || country}) می‌تواند تقاضای استخدام را جابه‌جا کند.`,
  };
}

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
  }
): CareerRiskAnalysis {
  const locale = normalizeCareerLocale(extra?.locale);
  const title = (jobTitle || "Your role").trim().slice(0, 120);
  const industry = extra?.industry || "";
  const years =
    typeof extra?.experienceYears === "number" &&
    Number.isFinite(extra.experienceYears)
      ? extra.experienceYears
      : null;
  const fa = locale === "fa";
  const loc = locationPressure(extra?.country, extra?.location);
  const bucket = detectRoleBucket(title, industry);

  let taskAutomation = 40;
  let toolMaturity = 45;
  let marketAdoption = 40;
  let agenticExposure = 35;
  const reasons: string[] = [];
  const skillsToBuild: string[] = [];
  const alternatives: string[] = [];

  if (bucket === "care") {
    taskAutomation -= 22;
    agenticExposure -= 18;
    reasons.push(
      fa
        ? "کار بالینی حضوری و مراقبت تنظیم‌شده به‌سختی کامل اتوماسیون می‌شود."
        : "Hands-on clinical care is hard to fully automate."
    );
  } else if (bucket === "architecture") {
    taskAutomation -= 8;
    toolMaturity += 8;
    reasons.push(
      fa
        ? "طراحی معماری به قضاوت حرفه‌ای، مجوز و هماهنگی میدانی وابسته است."
        : "Architecture still depends on professional judgment, codes, and site coordination."
    );
    skillsToBuild.push(
      ...(fa
        ? ["BIM", "پایداری", "هماهنگی پروژه"]
        : ["BIM", "Sustainable design", "Project coordination"])
    );
  } else if (bucket === "clerical") {
    taskAutomation += 30;
    marketAdoption += 25;
    reasons.push(
      fa
        ? "کارهای اداری تکراری هدف آسان اتوماسیون هستند."
        : "Repetitive office tasks are easy automation targets."
    );
  } else if (bucket === "tech" || bucket === "frontend") {
    taskAutomation += 14;
    toolMaturity += 25;
    agenticExposure += 16;
    reasons.push(
      fa
        ? "نقش‌های نرم‌افزاری با دستیارهای AI در حال تغییرند."
        : "Software roles are being reshaped by AI assistants."
    );
  }

  if (years != null && years >= 8) taskAutomation -= 5;
  if (years != null && years <= 2) taskAutomation += 5;
  marketAdoption += loc.delta;
  if (loc.noteEn) reasons.push(fa && loc.noteFa ? loc.noteFa : loc.noteEn);

  if (skillsToBuild.length === 0) {
    skillsToBuild.push(
      ...(fa
        ? ["سواد دیجیتال", "حل مسئله", "تخصص حوزه‌ای"]
        : ["Digital literacy", "Problem solving", "Domain specialization"])
    );
  }
  if (alternatives.length === 0) {
    alternatives.push(
      ...(fa
        ? ["نقش مجاور تخصصی", "مسیر سرپرستی"]
        : ["Adjacent specialist role", "Team lead path"])
    );
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);
  const place = [extra?.location, extra?.country].filter(Boolean).join(fa ? "، " : ", ");

  const summary = fa
    ? score >= 65
      ? `نقش «${title}»${place ? ` در ${place}` : ""} در معرض اتوماسیون نسبتاً بالا است.`
      : score >= 35
        ? `نقش «${title}»${place ? ` در ${place}` : ""} با تغییر متوسط ناشی از AI روبه‌روست.`
        : `نقش «${title}»${place ? ` در ${place}` : ""} در کوتاه‌مدت نسبتاً مقاوم است.`
    : score >= 65
      ? `${title}${place ? ` in ${place}` : ""}: elevated automation exposure.`
      : score >= 35
        ? `${title}${place ? ` in ${place}` : ""}: moderate AI-driven change.`
        : `${title}${place ? ` in ${place}` : ""}: relatively resilient near-term.`;

  return {
    jobTitle: title,
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary,
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: fa ? "۵–۱۰ سال" : "5–10 years",
    confidence: bucket === "generic" ? 52 : 64,
    industryOutlook: industry || place
      ? fa
        ? `صنعت: ${industry || "—"} · مکان: ${place || "—"}`
        : `Industry: ${industry || "n/a"} · Location: ${place || "n/a"}`
      : undefined,
  };
}

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
    message: params.paid
      ? undefined
      : locale === "fa"
        ? "برای مسیرهای جایگزین، به پلن Pro ارتقا دهید."
        : "Upgrade to Pro to unlock alternative role recommendations.",
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
