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


/** UI copy for heuristic fallback — all 7 product locales */
type LocaleCopy = Record<CareerRiskLocale, string>;

function L(locale: CareerRiskLocale, table: LocaleCopy): string {
  return table[locale] || table.en;
}

const TIME_HORIZON: LocaleCopy = {
  en: "5–10 years",
  es: "5–10 años",
  ar: "٥–١٠ سنوات",
  fa: "۵–۱۰ سال",
  hi: "5–10 वर्ष",
  fr: "5–10 ans",
  de: "5–10 Jahre",
};

const UPGRADE_MSG: LocaleCopy = {
  en: "Upgrade to Pro to unlock alternative role recommendations.",
  es: "Mejora a Pro para desbloquear recomendaciones de roles alternativos.",
  ar: "قم بالترقية إلى Pro لفتح توصيات الأدوار البديلة.",
  fa: "برای مسیرهای جایگزین، به پلن Pro ارتقا دهید.",
  hi: "वैकल्पिक भूमिका सुझाव अनलॉक करने के लिए Pro में अपग्रेड करें।",
  fr: "Passez à Pro pour débloquer les recommandations de rôles alternatifs.",
  de: "Upgrade auf Pro, um alternative Rollenempfehlungen freizuschalten.",
};

function summaryFor(
  locale: CareerRiskLocale,
  title: string,
  place: string,
  score: number
): string {
  const p = place ? { en: ` in ${place}`, es: ` en ${place}`, ar: ` في ${place}`, fa: ` در ${place}`, hi: ` (${place})`, fr: ` à ${place}`, de: ` in ${place}` }[locale] : "";
  if (score >= 65) {
    return L(locale, {
      en: `${title}${p}: elevated automation exposure.`,
      es: `${title}${p}: exposición elevada a la automatización.`,
      ar: `دور «${title}»${p} معرض بشكل مرتفع للأتمتة.`,
      fa: `نقش «${title}»${p} در معرض اتوماسیون نسبتاً بالا است.`,
      hi: `${title}${p}: स्वचालन का उच्च जोखिम।`,
      fr: `${title}${p} : exposition élevée à l'automatisation.`,
      de: `${title}${p}: erhöhtes Automatisierungsrisiko.`,
    });
  }
  if (score >= 35) {
    return L(locale, {
      en: `${title}${p}: moderate AI-driven change.`,
      es: `${title}${p}: cambio moderado impulsado por IA.`,
      ar: `دور «${title}»${p} يواجه تغييراً متوسطاً بسبب الذكاء الاصطناعي.`,
      fa: `نقش «${title}»${p} با تغییر متوسط ناشی از AI روبه‌روست.`,
      hi: `${title}${p}: AI से मध्यम परिवर्तन।`,
      fr: `${title}${p} : changement modéré lié à l'IA.`,
      de: `${title}${p}: moderate KI-bedingte Veränderung.`,
    });
  }
  return L(locale, {
    en: `${title}${p}: relatively resilient near-term.`,
    es: `${title}${p}: relativamente resiliente a corto plazo.`,
    ar: `دور «${title}»${p} مقاوم نسبياً على المدى القريب.`,
    fa: `نقش «${title}»${p} در کوتاه‌مدت نسبتاً مقاوم است.`,
    hi: `${title}${p}: निकट अवधि में अपेक्षाकृत सुरक्षित।`,
    fr: `${title}${p} : relativement résilient à court terme.`,
    de: `${title}${p}: kurzfristig relativ widerstandsfähig.`,
  });
}

function defaultSkills(locale: CareerRiskLocale): string[] {
  return {
    en: ["Digital literacy", "Problem-solving", "Domain specialization"],
    es: ["Alfabetización digital", "Resolución de problemas", "Especialización de dominio"],
    ar: ["محو الأمية الرقمية", "حل المشكلات", "تخصص المجال"],
    fa: ["سواد دیجیتال", "حل مسئله", "تخصص حوزه‌ای"],
    hi: ["डिजिटल साक्षरता", "समस्या समाधान", "क्षेत्र विशेषज्ञता"],
    fr: ["Culture numérique", "Résolution de problèmes", "Spécialisation métier"],
    de: ["Digitale Kompetenz", "Problemlösung", "Fachspezialisierung"],
  }[locale];
}

function defaultAlternatives(locale: CareerRiskLocale, title: string): string[] {
  return {
    en: [`Hybrid ${title} + AI roles`, "Training or supervising automated tools", "Roles leaning on interpersonal skills"],
    es: [`Roles híbridos ${title} + IA`, "Formación o supervisión de herramientas automatizadas", "Roles basados en habilidades interpersonales"],
    ar: [`أدوار هجينة ${title} + ذكاء اصطناعي`, "التدريب أو الإشراف على الأدوات المؤتمتة", "أدوار تعتمد على المهارات الشخصية"],
    fa: [`نقش‌های ترکیبی ${title} + هوش مصنوعی`, "آموزش یا نظارت بر ابزارهای خودکار", "نقش‌هایی متکی بر مهارت‌های بین‌فردی"],
    hi: [`हाइब्रिड ${title} + AI भूमिकाएँ`, "स्वचालित उपकरणों का प्रशिक्षण/पर्यवेक्षण", "पारस्परिक कौशल वाली भूमिकाएँ"],
    fr: [`Rôles hybrides ${title} + IA`, "Formation ou supervision d'outils automatisés", "Rôles axés sur les compétences interpersonnelles"],
    de: [`Hybride ${title}+KI-Rollen`, "Schulung oder Aufsicht automatisierter Tools", "Rollen mit Fokus auf Zwischenmenschliche Fähigkeiten"],
  }[locale];
}

function reasonCare(locale: CareerRiskLocale): string {
  return L(locale, {
    en: "Hands-on clinical care is hard to fully automate.",
    es: "La atención clínica presencial es difícil de automatizar por completo.",
    ar: "الرعاية السريرية الحضورية يصعب أتمتتها بالكامل.",
    fa: "کار بالینی حضوری و مراقبت تنظیم‌شده به‌سختی کامل اتوماسیون می‌شود.",
    hi: "नैदानिक देखभाल को पूरी तरह स्वचालित करना कठिन है।",
    fr: "Les soins cliniques en présentiel sont difficiles à automatiser entièrement.",
    de: "Praktische klinische Versorgung lässt sich kaum vollständig automatisieren.",
  });
}

function reasonArchitecture(locale: CareerRiskLocale): string {
  return L(locale, {
    en: "Architecture still depends on professional judgment, codes, and site coordination.",
    es: "La arquitectura sigue dependiendo del juicio profesional, códigos y coordinación en obra.",
    ar: "لا تزال العمارة تعتمد على الحكم المهني واللوائح والتنسيق الميداني.",
    fa: "طراحی معماری به قضاوت حرفه‌ای، مجوز و هماهنگی میدانی وابسته است.",
    hi: "वास्तुकला अभी भी पेशेवर निर्णय, कोड और साइट समन्वय पर निर्भर है।",
    fr: "L'architecture dépend encore du jugement professionnel, des normes et de la coordination de chantier.",
    de: "Architektur hängt weiterhin von Fachurteil, Normen und Baustellenkoordination ab.",
  });
}

function reasonClerical(locale: CareerRiskLocale): string {
  return L(locale, {
    en: "Repetitive office tasks are easy automation targets.",
    es: "Las tareas administrativas repetitivas son objetivos fáciles de automatización.",
    ar: "المهام المكتبية المتكررة أهداف سهلة للأتمتة.",
    fa: "کارهای اداری تکراری هدف آسان اتوماسیون هستند.",
    hi: "दोहराव वाले कार्यालय कार्य स्वचालन के आसान लक्ष्य हैं।",
    fr: "Les tâches de bureau répétitives sont des cibles faciles d'automatisation.",
    de: "Wiederkehrende Büroaufgaben sind leichte Automatisierungsziele.",
  });
}

function reasonTech(locale: CareerRiskLocale): string {
  return L(locale, {
    en: "Software roles are being reshaped by AI assistants.",
    es: "Los roles de software están siendo transformados por asistentes de IA.",
    ar: "أدوار البرمجيات تتغير بفعل مساعدي الذكاء الاصطناعي.",
    fa: "نقش‌های نرم‌افزاری با دستیارهای AI در حال تغییرند.",
    hi: "सॉफ़्टवेयर भूमिकाएँ AI सहायक से बदल रही हैं।",
    fr: "Les rôles logiciels sont remodelés par les assistants d'IA.",
    de: "Software-Rollen werden durch KI-Assistenten umgestaltet.",
  });
}

function industryOutlookLine(
  locale: CareerRiskLocale,
  industry: string,
  place: string
): string {
  return L(locale, {
    en: `Industry: ${industry || "n/a"} · Location: ${place || "n/a"}`,
    es: `Sector: ${industry || "n/d"} · Ubicación: ${place || "n/d"}`,
    ar: `القطاع: ${industry || "—"} · الموقع: ${place || "—"}`,
    fa: `صنعت: ${industry || "—"} · مکان: ${place || "—"}`,
    hi: `उद्योग: ${industry || "—"} · स्थान: ${place || "—"}`,
    fr: `Secteur : ${industry || "n/a"} · Lieu : ${place || "n/a"}`,
    de: `Branche: ${industry || "k. A."} · Ort: ${place || "k. A."}`,
  });
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
    reasons.push(reasonCare(locale));
  } else if (bucket === "architecture") {
    taskAutomation -= 8;
    toolMaturity += 8;
    reasons.push(reasonArchitecture(locale));
    skillsToBuild.push(
      ...{
        en: ["BIM", "Sustainable design", "Project coordination"],
        es: ["BIM", "Diseño sostenible", "Coordinación de proyectos"],
        ar: ["BIM", "تصميم مستدام", "تنسيق المشاريع"],
        fa: ["BIM", "پایداری", "هماهنگی پروژه"],
        hi: ["BIM", "टिकाऊ डिज़ाइन", "प्रोजेक्ट समन्वय"],
        fr: ["BIM", "Conception durable", "Coordination de projet"],
        de: ["BIM", "Nachhaltiges Design", "Projektkoordination"],
      }[locale]
    );
  } else if (bucket === "clerical") {
    taskAutomation += 30;
    marketAdoption += 25;
    reasons.push(reasonClerical(locale));
  } else if (bucket === "tech" || bucket === "frontend") {
    taskAutomation += 14;
    toolMaturity += 25;
    agenticExposure += 16;
    reasons.push(reasonTech(locale));
  }

  if (years != null && years >= 8) taskAutomation -= 5;
  if (years != null && years <= 2) taskAutomation += 5;
  marketAdoption += loc.delta;
  if (loc.noteEn) {
    // Prefer locale-specific location note when available (fa), else English
    reasons.push(
      locale === "fa" && loc.noteFa ? loc.noteFa : loc.noteEn
    );
  }

  if (skillsToBuild.length === 0) {
    skillsToBuild.push(...defaultSkills(locale));
  }
  if (alternatives.length === 0) {
    alternatives.push(...defaultAlternatives(locale, title));
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);
  const place = [extra?.location, extra?.country]
    .filter(Boolean)
    .join(locale === "fa" || locale === "ar" ? "، " : ", ");

  const summary = summaryFor(locale, title, place, score);

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
    timeHorizon: L(locale, TIME_HORIZON),
    confidence: bucket === "generic" ? 52 : 64,
    industryOutlook:
      industry || place
        ? industryOutlookLine(locale, industry, place)
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
