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

/** Strict: reject missing / NaN / out-of-range — do NOT invent 50 */
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

export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
}

/**
 * Consistency rule:
 * If |riskScore - composite(subScores)| > 35, prefer composite from subScores.
 * If subScores invalid → reject entire AI result (null).
 */
export function reconcileScoreWithSubScores(
  riskScore: number,
  subScores: CareerRiskSubScores
): number {
  const composite = compositeFromSubScores(subScores);
  const raw = clampScore(riskScore);
  if (Math.abs(raw - composite) > 35) {
    return composite;
  }
  return raw;
}

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
    const parsed = careerRiskAiOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }

    const data = parsed.data;
    const subScores = parseSubScoresStrict(data.subScores);
    if (!subScores) return null;

    if (!data.summary || data.summary.trim().length < 10) return null;
    if (!data.reasons?.length || !data.skillsToBuild?.length) return null;
    if (data.confidence == null || !data.timeHorizon) return null;

    const riskScore = reconcileScoreWithSubScores(data.riskScore, subScores);
    const jobTitle = userJobTitle.trim().slice(0, 120);

    return {
      jobTitle,
      riskScore,
      riskLevel: scoreToRiskLevel(riskScore),
      summary: data.summary.slice(0, 2500),
      reasons: asStringArray(data.reasons, 10),
      skillsToBuild: asStringArray(data.skillsToBuild, 12),
      alternatives: asStringArray(data.alternatives, 10),
      source: "ai",
      subScores,
      timeHorizon: String(data.timeHorizon).slice(0, 40),
      confidence: clampScore(data.confidence),
      industryOutlook: data.industryOutlook
        ? String(data.industryOutlook).slice(0, 500)
        : undefined,
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
      "physical therapy",
      "therapist",
      "nurse",
      "doctor",
      "physician",
      "surgeon",
      "dentist",
      "midwife",
      "caregiver",
      "paramedic",
      "فیزیوتراپ",
      "پزشک",
      "پرستار",
      "دکتر",
      "جراح",
      "دندانپزشک",
      "ماما",
      "طبيب",
      "ممرض",
      "arzt",
      "krankenpfleger",
      "physiotherapeut",
      "médecin",
      "infirmier",
      "médico",
      "enfermero",
      "fisioterapeuta",
      "चिकित्सक",
      "नर्स",
    ])
  ) {
    return "care";
  }

  if (
    includesAny(blob, [
      "architect",
      "architecture",
      "معمار",
      "معماری",
      "architekt",
      "architecte",
      "arquitecto",
      "urbanist",
      "شهرساز",
    ])
  ) {
    return "architecture";
  }

  if (
    includesAny(blob, [
      "electrician",
      "plumber",
      "welder",
      "carpenter",
      "mechanic",
      "technician",
      "firefighter",
      "chef",
      "cook",
      "برقکار",
      "لوله‌کش",
      "جوشکار",
      "مکانیک",
      "آشپز",
    ])
  ) {
    return "trades";
  }

  if (
    includesAny(blob, [
      "teacher",
      "professor",
      "instructor",
      "tutor",
      "معلم",
      "استاد",
      "مدرس",
      "lehrer",
      "professeur",
      "profesor",
    ])
  ) {
    return "education";
  }

  if (
    includesAny(blob, [
      "data entry",
      "cashier",
      "clerk",
      "receptionist",
      "telemarket",
      "call center",
      "transcription",
      "bookkeeper",
      "proofreader",
      "منشی",
      "صندوقدار",
      "ورود داده",
    ])
  ) {
    return "clerical";
  }

  if (
    includesAny(blob, [
      "frontend",
      "front-end",
      "front end",
      "ui engineer",
      "ui developer",
      "فرانت",
    ])
  ) {
    return "frontend";
  }

  if (
    includesAny(blob, [
      "developer",
      "engineer",
      "software",
      "programmer",
      "devops",
      "backend",
      "full stack",
      "data scientist",
      "analyst",
      "برنامه نویس",
      "برنامه‌نویس",
      "مهندس نرم",
      "توسعه دهنده",
    ])
  ) {
    return "tech";
  }

  if (
    includesAny(blob, [
      "accountant",
      "bookkeep",
      "accounting",
      "auditor",
      "حسابدار",
      "حسابداری",
    ])
  ) {
    return "finance";
  }

  return "generic";
}

/** Rough market pressure hints from country/city text (not a labor API). */
function locationPressure(
  country?: string,
  location?: string
): { delta: number; noteEn: string; noteFa: string } {
  const blob = `${country || ""} ${location || ""}`.toLowerCase();
  if (!blob.trim()) {
    return { delta: 0, noteEn: "", noteFa: "" };
  }

  // Competitive tech hubs → slightly higher automation/tool pressure
  if (
    includesAny(blob, [
      "silicon valley",
      "san francisco",
      "seattle",
      "london",
      "berlin",
      "amsterdam",
      "singapore",
      "bangalore",
      "bengaluru",
      "toronto",
    ])
  ) {
    return {
      delta: 6,
      noteEn: `In ${location || country}, competitive tech adoption can raise tool pressure faster than average.`,
      noteFa: `در ${location || country} رقابت و پذیرش ابزارهای دیجیتال می‌تواند فشار اتوماسیون را سریع‌تر از میانگین بالا ببرد.`,
    };
  }

  // Large regional markets with mixed formal/informal sectors
  if (
    includesAny(blob, [
      "iran",
      "tehran",
      "تهران",
      "ایران",
      "iraq",
      "egypt",
      "pakistan",
      "india",
      "delhi",
      "mumbai",
      "nigeria",
      "lagos",
    ])
  ) {
    return {
      delta: -4,
      noteEn: `Local market structure in ${location || country} still relies heavily on in-person networks and licensed practice for many roles.`,
      noteFa: `ساختار بازار محلی در ${location || country} برای بسیاری از مشاغل همچنان به حضور فیزیکی، شبکه حرفه‌ای و مجوزهای رسمی وابسته است.`,
    };
  }

  if (
    includesAny(blob, [
      "germany",
      "deutschland",
      "france",
      "canada",
      "australia",
      "netherlands",
      "sweden",
      "norway",
    ])
  ) {
    return {
      delta: 3,
      noteEn: `In ${country || location}, regulated professions and strong digital infrastructure shape automation differently by sector.`,
      noteFa: `در ${country || location} زیرم‌های شغلی و زیرساخت دیجیتال، مسیر اتوماسیون را بر اساس بخش متفاوت می‌کند.`,
    };
  }

  return {
    delta: 0,
    noteEn: `Location context (${location || country}) can shift hiring demand even when task automation is similar globally.`,
    noteFa: `بافت مکانی (${location || country}) می‌تواند تقاضای استخدام را جابه‌جا کند؛ حتی اگر سطح اتوماسیون جهانی مشابه باشد.`,
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

  let taskAutomation = 40;
  let toolMaturity = 45;
  let marketAdoption = 40;
  let agenticExposure = 35;
  const reasons: string[] = [];
  const skillsToBuild: string[] = [];
  const alternatives: string[] = [];
  const bucket = detectRoleBucket(title, industry);
  const loc = locationPressure(extra?.country, extra?.location);

  const fa = locale === "fa";

  if (bucket === "care") {
    taskAutomation -= 22;
    agenticExposure -= 18;
    marketAdoption -= 12;
    reasons.push(
      fa
        ? "ارزیابی فیزیکی، درمان حضوری و مراقبت تنظیم‌شده به‌سختی به‌طور کامل اتوماسیون می‌شود."
        : "Hands-on clinical work, physical assessment, and regulated care are hard to fully automate."
    );
    skillsToBuild.push(
      ...(fa
        ? [
            "درمان مبتنی بر شواهد",
            "ارتباط با بیمار",
            "همکاری بین‌رشته‌ای",
            "مستندسازی بالینی",
          ]
        : [
            "Evidence-based practice",
            "Patient communication",
            "Interdisciplinary collaboration",
            "Clinical documentation",
          ])
    );
    alternatives.push(
      ...(fa
        ? ["فیزیوتراپیست ارشد", "سرپرست توانبخشی", "مسیر ورزشی/ارتوپدی"]
        : [
            "Senior clinician",
            "Rehab team lead",
            "Sports / orthopedic track",
          ])
    );
  } else if (bucket === "architecture") {
    taskAutomation -= 8;
    agenticExposure -= 10;
    toolMaturity += 8;
    reasons.push(
      fa
        ? "طراحی معماری و مسئولیت حرفه‌ای همچنان به قضاوت انسانی، مجوز و هماهنگی میدانی وابسته است؛ هرچند ابزارهای مدل‌سازی دیجیتال در حال گسترش‌اند."
        : "Architectural design still depends on professional judgment, codes/permits, and site coordination—while digital modeling tools keep expanding."
    );
    skillsToBuild.push(
      ...(fa
        ? [
            "مدل‌سازی اطلاعات ساختمان (BIM)",
            "پایداری و بهینه‌سازی انرژی",
            "هماهنگی پروژه",
            "ابزارهای طراحی مولد",
          ]
        : [
            "BIM / Revit workflows",
            "Sustainable design",
            "Project coordination",
            "Generative design tools",
          ])
    );
    alternatives.push(
      ...(fa
        ? ["مدیر پروژه ساختمانی", "مشاور پایداری", "طراح داخلی ارشد"]
        : [
            "Construction project manager",
            "Sustainability consultant",
            "Senior interior designer",
          ])
    );
  } else if (bucket === "trades") {
    taskAutomation -= 18;
    agenticExposure -= 15;
    reasons.push(
      fa
        ? "کارهای فنی دستی و کارگاهی به مهارت فیزیکی و حضور در محل وابسته‌اند."
        : "Skilled trades rely on physical presence and hands-on craft that resist full automation."
    );
  } else if (bucket === "education") {
    taskAutomation -= 10;
    reasons.push(
      fa
        ? "آموزش حضوری و مربی‌گری انسانی همچنان نقش محوری دارد؛ ابزارهای دیجیتال مکمل‌اند نه جایگزین کامل."
        : "In-person teaching and mentoring remain central; digital tools complement rather than fully replace educators."
    );
  } else if (bucket === "clerical") {
    taskAutomation += 30;
    toolMaturity += 20;
    marketAdoption += 25;
    agenticExposure += 15;
    reasons.push(
      fa
        ? "کارهای اداری تکراری از آسان‌ترین اهداف نرم‌افزار و هوش مصنوعی هستند."
        : "Repetitive, well-specified office tasks are among the easiest for software and AI to absorb."
    );
  } else if (bucket === "tech") {
    taskAutomation += 12;
    toolMaturity += 25;
    marketAdoption += 20;
    agenticExposure += 18;
    reasons.push(
      fa
        ? "نقش‌های نرم‌افزاری با دستیارهای AI در حال تغییرند؛ کارهای روتین بیشترین فشار را می‌بینند."
        : "Software roles are being reshaped by AI assistants; routine implementation faces the most pressure."
    );
    skillsToBuild.push(
      ...(fa
        ? ["معماری سیستم", "بازبینی خروجی AI", "تست و کیفیت", "Cloud / DevOps"]
        : [
            "System design",
            "AI-assisted development + review",
            "Testing & quality",
            "Cloud / DevOps",
          ])
    );
  } else if (bucket === "frontend") {
    taskAutomation += 18;
    toolMaturity += 28;
    marketAdoption += 22;
    agenticExposure += 16;
    reasons.push(
      fa
        ? "تولید خودکار UI در حال رشد است؛ تمایز در UX، دسترسی‌پذیری و کارایی است."
        : "UI boilerplate is increasingly tool-generated; differentiation shifts to UX, accessibility, and performance."
    );
  } else if (bucket === "finance") {
    taskAutomation += 18;
    toolMaturity += 15;
    marketAdoption += 12;
    reasons.push(
      fa
        ? "گزارش‌گیری استاندارد هدف اتوماسیون است؛ مشاوره و قضاوت مالی دفاع‌پذیرتر است."
        : "Standard reporting is an automation target; advisory judgment remains more defensible."
    );
  }

  if (years != null && years >= 8) {
    taskAutomation -= 5;
    reasons.push(
      fa
        ? "سابقه بالاتر معمولاً با قضاوت حرفه‌ای و مربی‌گری همراه است."
        : "Longer experience often correlates with judgment and mentoring that are harder to automate."
    );
  } else if (years != null && years <= 2) {
    taskAutomation += 5;
    reasons.push(
      fa
        ? "نقش‌های تازه‌کار اغلب کارهای استانداردتری دارند که ابزارها بخشی از آن را پوشش می‌دهند."
        : "Early-career roles often include standardized tasks that tools can partially cover."
    );
  }

  // Apply location delta mainly to marketAdoption / toolMaturity
  marketAdoption += loc.delta;
  toolMaturity += Math.round(loc.delta / 2);
  if (loc.noteEn || loc.noteFa) {
    reasons.push(fa && loc.noteFa ? loc.noteFa : loc.noteEn);
  }

  if (skillsToBuild.length === 0) {
    skillsToBuild.push(
      ...(fa
        ? ["سواد دیجیتال", "حل مسئله", "ارتباطات", "تخصص حوزه‌ای"]
        : [
            "Digital literacy",
            "Problem solving",
            "Communication",
            "Domain specialization",
          ])
    );
    reasons.push(
      fa
        ? "مهارت‌های بادوام، تاب‌آوری بلندمدت را بالا می‌برند."
        : "Building durable, hard-to-automate skills improves long-term resilience."
    );
  }

  if (alternatives.length === 0) {
    alternatives.push(
      ...(fa
        ? ["نقش مجاور تخصصی", "مسیر سرپرستی", "تخصص + ابزار دیجیتال"]
        : [
            "Adjacent specialist role",
            "Team lead path",
            "Hybrid domain + digital tools",
          ])
    );
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);

  const place = [extra?.location, extra?.country].filter(Boolean).join("، ");
  const placeEn = [extra?.location, extra?.country].filter(Boolean).join(", ");

  let summary: string;
  if (fa) {
    summary =
      score >= 65
        ? `نقش «${title}»${place ? ` در ${place}` : ""} در افق ۵ تا ۱۰ سال در معرض اتوماسیون نسبتاً بالایی است. روی مهارت‌های مکمل هوش مصنوعی تمرکز کنید.`
        : score >= 35
          ? `نقش «${title}»${place ? ` در ${place}` : ""} با تغییر متوسط ناشی از هوش مصنوعی روبه‌روست. ارتقای هدفمند مهارت‌ها تاب‌آوری را حفظ می‌کند.`
          : `نقش «${title}»${place ? ` در ${place}` : ""} در کوتاه‌مدت نسبتاً مقاوم است؛ به‌خاطر کار حضوری، قضاوت و تعامل انسانی. یادگیری مداوم ضروری است.`;
  } else {
    summary =
      score >= 65
        ? `${title}${placeEn ? ` in ${placeEn}` : ""}: elevated automation exposure over the next 5–10 years. Prioritize skills that complement AI.`
        : score >= 35
          ? `${title}${placeEn ? ` in ${placeEn}` : ""}: moderate change from AI is likely. Targeted upskilling can keep the role resilient.`
          : `${title}${placeEn ? ` in ${placeEn}` : ""}: relatively resilient near-term due to hands-on work, judgment, and human interaction—continuous learning still matters.`;
  }

  let industryOutlook: string | undefined;
  if (industry || place) {
    industryOutlook = fa
      ? `زمینه صنعت: ${industry || "نامشخص"}${place ? ` · مکان: ${place}` : ""}. شرایط بازار محلی می‌تواند امتیاز را جابه‌جا کند.`
      : `Industry: ${industry || "n/a"}${placeEn ? ` · Location: ${placeEn}` : ""}. Local market conditions may shift the score.`;
  }

  return {
    jobTitle: title,
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary,
    reasons: Array.from(new Set(reasons.filter(Boolean))).slice(0, 6),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: fa ? "۵–۱۰ سال" : "5–10 years",
    confidence: bucket === "generic" ? 52 : 64,
    industryOutlook,
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
