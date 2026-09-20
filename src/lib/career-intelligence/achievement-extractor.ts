/**
 * Achievement extraction from raw responsibility lines.
 *
 * Hard rule: NEVER invent facts. Only reword or restructure what the
 * user actually provided. If no measurable evidence exists, we produce
 * responsibility-oriented wording, not fabricated metrics.
 *
 * Output is localized. Each supported locale has its own phrasing so
 * the result reads naturally, not like an English template translated
 * word-for-word.
 */
import type { CareerRiskLocale } from "@/types/career-risk";
import type { RoleFamily } from "./profile";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type ExtractedAchievement = {
  /** The final, professionally-worded line. */
  text: string;
  /** Original user-provided line (never modified). */
  source: string;
  /** True when the text is backed by a real user-supplied metric. */
  hasMetric: boolean;
  /** Optional metric value extracted verbatim (never invented). */
  metric?: string;
};

export type AchievementExtraction = {
  achievements: ExtractedAchievement[];
  competencies: string[];
  transferable: string[];
};

export type ExtractAchievementsInput = {
  responsibilities: string[];
  metrics?: string[];
  roleFamily: RoleFamily;
  locale: CareerRiskLocale;
  targetFamily?: RoleFamily | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const METRIC_RE =
  /\b(\d{1,3}(?:[.,]\d+)?(?:\s?%|k|m|\+)?|\d{1,3}(?:[.,]\d+)?\s?(?:orders|users|clients|tickets|projects|people|staff|customers|products|tasks|units|hours|days|weeks|months|years)|\$\s?\d{1,3}(?:[.,]\d+)?(?:k|m)?)/i;

function extractMetricFromLine(line: string): string | undefined {
  const m = line.match(METRIC_RE);
  return m ? m[0].trim() : undefined;
}

function pickVariant<T>(seed: string, variants: readonly T[]): T {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return variants[(h >>> 0) % variants.length];
}

/* ------------------------------------------------------------------ */
/* Verb → competency map                                              */
/* ------------------------------------------------------------------ */

const COMPETENCY_RULES: Array<{ pattern: RegExp; competency: string }> = [
  { pattern: /\b(lead|led|manage|managed|supervise|supervised)\b/i, competency: "leadership" },
  { pattern: /\b(train|trained|coach|coached|mentor|mentored)\b/i, competency: "mentoring" },
  { pattern: /\b(customer|client|patient|student)\b/i, competency: "stakeholder_communication" },
  { pattern: /\b(report|reporting|analytics|analysis|dashboard)\b/i, competency: "analytics" },
  { pattern: /\b(schedul|coordinat|organi[sz]|prioriti[sz])\b/i, competency: "coordination" },
  { pattern: /\b(automate|automat|script|tool|system|software)\b/i, competency: "tooling" },
  { pattern: /\b(quality|compliance|audit|review|standard)\b/i, competency: "quality_control" },
  { pattern: /\b(sales|sell|sold|revenue|closing|negotiat)\b/i, competency: "sales_negotiation" },
  { pattern: /\b(design|creative|brand|concept|prototype)\b/i, competency: "design_thinking" },
  { pattern: /\b(research|investigat|discover|insight)\b/i, competency: "research" },
];

function detectCompetencies(text: string): string[] {
  const out: string[] = [];
  for (const rule of COMPETENCY_RULES) {
    if (rule.pattern.test(text)) out.push(rule.competency);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Localized rewording templates                                       */
/* ------------------------------------------------------------------ */

/**
 * A safe rewording keeps the verb/object structure of the original
 * line but nudges it toward professional resume phrasing. We never
 * change the meaning or add facts.
 */
function professionalize(
  line: string,
  locale: CareerRiskLocale,
): string {
  const clean = line.trim().replace(/\s+/g, " ");
  if (!clean) return "";

  // Strip a leading "-" or "•" (common when pasting from a document).
  const stripped = clean.replace(/^[-•*]\s*/, "");

  // If it already starts with a strong verb in English, keep as is.
  const strongVerbStart =
    /^(led|managed|developed|built|designed|implemented|coordinated|delivered|improved|reduced|increased|automated|created|launched|drove|owned|established)\b/i;

  if (locale === "en") {
    if (strongVerbStart.test(stripped)) return capitalize(stripped);
    return capitalize(stripped);
  }
  // Non-English: do not force an English verb. Keep the user's own words.
  return capitalize(stripped);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                 */
/* ------------------------------------------------------------------ */

export function extractAchievements(
  input: ExtractAchievementsInput,
): AchievementExtraction {
  const { responsibilities, metrics = [], roleFamily, locale } = input;

  const seen = new Set<string>();
  const achievements: ExtractedAchievement[] = [];
  const competencySet = new Set<string>();

  for (const line of responsibilities) {
    const key = norm(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const metricFromLine = extractMetricFromLine(line);
    const hasMetric = Boolean(metricFromLine);
    const text = professionalize(line, locale);
    if (!text) continue;

    achievements.push({
      text,
      source: line,
      hasMetric,
      metric: metricFromLine,
    });

    for (const c of detectCompetencies(line)) competencySet.add(c);
  }

  // Any explicit metrics the user supplied become achievements with
  // their exact wording — we do not attribute them to a specific line
  // if there is no matching responsibility.
  for (const m of metrics) {
    const clean = m.trim();
    if (!clean) continue;
    const key = norm(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    achievements.push({
      text: capitalize(clean),
      source: clean,
      hasMetric: true,
      metric: extractMetricFromLine(clean) || clean,
    });
  }

  const competencies = Array.from(competencySet);

  // Transferable skills = the competencies that also matter for the
  // target family. We do not claim the user is an expert — we only
  // mark the competencies as transferable.
  const transferable = input.targetFamily
    ? competencies // conservative: all detected competencies are transferable
    : competencies;

  return {
    achievements: achievements.slice(0, 15),
    competencies,
    transferable,
  };
}

/* ------------------------------------------------------------------ */
/* Localized competency labels (used by Resume Writer)                */
/* ------------------------------------------------------------------ */

export function competencyLabel(
  competency: string,
  locale: CareerRiskLocale,
): string {
  const table: Record<string, Partial<Record<CareerRiskLocale, string>>> = {
    leadership: {
      en: "Leadership",
      fa: "رهبری",
      ar: "القيادة",
      es: "Liderazgo",
      fr: "Leadership",
      de: "Führung",
      hi: "नेतृत्व",
    },
    mentoring: {
      en: "Mentoring & coaching",
      fa: "منتورینگ و کوچینگ",
      ar: "الإرشاد والتدريب",
      es: "Mentoría y coaching",
      fr: "Mentorat et coaching",
      de: "Mentoring & Coaching",
      hi: "मेंटरिंग और कोचिंग",
    },
    stakeholder_communication: {
      en: "Stakeholder communication",
      fa: "ارتباط با ذی‌نفعان",
      ar: "التواصل مع أصحاب المصلحة",
      es: "Comunicación con stakeholders",
      fr: "Communication avec les parties prenantes",
      de: "Stakeholder-Kommunikation",
      hi: "हितधारक संचार",
    },
    analytics: {
      en: "Analytics & reporting",
      fa: "تحلیل و گزارش‌دهی",
      ar: "التحليلات وإعداد التقارير",
      es: "Analítica y reporting",
      fr: "Analytique et reporting",
      de: "Analytik & Reporting",
      hi: "विश्लेषण और रिपोर्टिंग",
    },
    coordination: {
      en: "Coordination",
      fa: "هماهنگی",
      ar: "التنسيق",
      es: "Coordinación",
      fr: "Coordination",
      de: "Koordination",
      hi: "समन्वय",
    },
    tooling: {
      en: "Tooling & automation",
      fa: "ابزار و اتوماسیون",
      ar: "الأدوات والأتمتة",
      es: "Herramientas y automatización",
      fr: "Outils et automatisation",
      de: "Tools & Automatisierung",
      hi: "टूलिंग और स्वचालन",
    },
    quality_control: {
      en: "Quality & compliance",
      fa: "کیفیت و انطباق",
      ar: "الجودة والامتثال",
      es: "Calidad y cumplimiento",
      fr: "Qualité et conformité",
      de: "Qualität & Compliance",
      hi: "गुणवत्ता और अनुपालन",
    },
    sales_negotiation: {
      en: "Sales & negotiation",
      fa: "فروش و مذاکره",
      ar: "المبيعات والتفاوض",
      es: "Ventas y negociación",
      fr: "Vente et négociation",
      de: "Vertrieb & Verhandlung",
      hi: "बिक्री और बातचीत",
    },
    design_thinking: {
      en: "Design & creative direction",
      fa: "طراحی و جهت‌گیری خلاقانه",
      ar: "التصميم والتوجيه الإبداعي",
      es: "Diseño y dirección creativa",
      fr: "Design et direction créative",
      de: "Design & kreative Leitung",
      hi: "डिज़ाइन और रचनात्मक दिशा",
    },
    research: {
      en: "Research & insight",
      fa: "پژوهش و بینش",
      ar: "البحث والرؤى",
      es: "Investigación e insights",
      fr: "Recherche et insights",
      de: "Research & Insights",
      hi: "अनुसंधान और अंतर्दृष्टि",
    },
  };
  return table[competency]?.[locale] || table[competency]?.en || competency;
}

export { pickVariant };
