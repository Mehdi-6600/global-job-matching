/**
 * Deterministic intent classification for career-related requests.
 *
 * This module is intentionally simple and rule-based:
 *  - No network calls.
 *  - Stable output for the same input.
 *  - Never throws.
 *
 * The goal is not to be a full NLU system — it is to route a request
 * to the right response composer so users get the structure they
 * actually asked for.
 */
import type { NormalizedCareerProfile } from "./normalize-profile";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export const CAREER_INTENTS = [
  "risk_analysis",
  "skill_gap",
  "career_transition",
  "salary_guidance",
  "interview_prep",
  "resume_advice",
  "migration",
  "job_search",
  "general",
] as const;

export type CareerIntent = (typeof CAREER_INTENTS)[number];

export type IntentClassification = {
  intent: CareerIntent;
  /** 0..1 confidence; deterministic from the input. */
  confidence: number;
  /** Matched keywords (for diagnostics; not shown to the user). */
  matched: string[];
};

/* ------------------------------------------------------------------ */
/* Keyword tables                                                     */
/* ------------------------------------------------------------------ */

const INTENT_KEYWORDS: Record<CareerIntent, RegExp[]> = {
  risk_analysis: [
    /risk/i,
    /automation/i,
    /automate/i,
    /ai replac/i,
    /مخاطر/i,
    /ریسک/i,
    /خطر/i,
    /اتوماسیون/i,
    /المخاطر/i,
    /الأتمتة/i,
    /riesgo/i,
    /automatizaci/i,
    /risque/i,
    /automatis/i,
    /risiko/i,
    /jokhim|जोखिम/i,
  ],
  skill_gap: [
    /skill/i,
    /learn/i,
    /gap/i,
    /what should i study/i,
    /مهارت/i,
    /یاد بگیر/i,
    /شکاف/i,
    /مهارة|مهارات/i,
    /habilidad/i,
    /compétence/i,
    /fähigkeit/i,
    /कौशल/i,
  ],
  career_transition: [
    /transition/i,
    /switch/i,
    /change (my )?career/i,
    /move to/i,
    /انتقال/i,
    /تغییر شغل/i,
    /تحول/i,
    /انتقال/i,
    /transición/i,
    /transition/i,
    /wechsel/i,
    /बदलाव|संक्रमण/i,
  ],
  salary_guidance: [
    /salary/i,
    /pay/i,
    /compensation/i,
    /rights/i,
    /حقوق/i,
    /دستمزد/i,
    /راتب/i,
    /salario/i,
    /salaire/i,
    /gehalt/i,
    /वेतन/i,
  ],
  interview_prep: [
    /interview/i,
    /مصاحبه/i,
    /مقابلة/i,
    /entrevista/i,
    /entretien/i,
    /interview/i,
    /साक्षात्कार/i,
  ],
  resume_advice: [
    /resume/i,
    /cv/i,
    /رزومه/i,
    /سيرة/i,
    /currículum/i,
    /lebenslauf/i,
    /रेज़्यूमे/i,
  ],
  migration: [
    /migrat/i,
    /immigrat/i,
    /visa/i,
    /relocat/i,
    /move (to|abroad)/i,
    /مهاجرت/i,
    /ویزا/i,
    /هجرة|تأشيرة/i,
    /migración/i,
    /migration/i,
    /einwander/i,
    /प्रवास|वीज़ा/i,
  ],
  job_search: [
    /find a job/i,
    /apply/i,
    /job search/i,
    /پیدا کردن شغل/i,
    /جستجوی شغل/i,
    /بحث عن عمل/i,
    /buscar empleo/i,
    /recherche d'emploi/i,
    /jobsuche/i,
    /नौकरी खोज/i,
  ],
  general: [],
};

/* ------------------------------------------------------------------ */
/* Baseline intent from profile signals                               */
/* ------------------------------------------------------------------ */

function profileHints(profile: NormalizedCareerProfile | null): CareerIntent | null {
  if (!profile) return null;
  if (profile.transition && profile.transition.fromFamily !== profile.transition.toFamily) {
    return "career_transition";
  }
  if (profile.missingSkills.length >= 3) return "skill_gap";
  return null;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Classify an intent from an optional free-text question and an
 * optional normalized profile.
 *
 * Priority:
 *   1. Explicit keywords in the question (highest score wins).
 *   2. Profile signals (transition / skill gap).
 *   3. "general".
 *
 * Deterministic: same inputs → same output.
 */
export function classifyIntent(input: {
  question?: string | null;
  profile?: NormalizedCareerProfile | null;
}): IntentClassification {
  const q = (input.question || "").trim();
  const matched: string[] = [];

  if (q.length > 0) {
    let best: { intent: CareerIntent; score: number; hits: string[] } = {
      intent: "general",
      score: 0,
      hits: [],
    };

    for (const intent of CAREER_INTENTS) {
      if (intent === "general") continue;
      const patterns = INTENT_KEYWORDS[intent];
      const hits: string[] = [];
      for (const re of patterns) {
        const m = q.match(re);
        if (m) hits.push(m[0]);
      }
      if (hits.length === 0) continue;

      // Score: number of hits, weighted by intent-specific priority.
      // We keep it simple and deterministic.
      const score = hits.length;
      if (score > best.score) {
        best = { intent, score, hits };
      }
    }

    if (best.score > 0) {
      matched.push(...best.hits);
      const confidence = Math.min(1, 0.4 + best.score * 0.2);
      return { intent: best.intent, confidence, matched };
    }
  }

  const hinted = profileHints(input.profile ?? null);
  if (hinted) {
    return { intent: hinted, confidence: 0.5, matched: ["profile_signal"] };
  }

  return { intent: "general", confidence: 0.2, matched: [] };
}

/* ------------------------------------------------------------------ */
/* Localized intent labels (for diagnostics / logs)                   */
/* ------------------------------------------------------------------ */

export function intentLabel(
  intent: CareerIntent,
  locale: "en" | "fa" | "ar" | "es" | "fr" | "de" | "hi",
): string {
  const table: Record<CareerIntent, Partial<Record<typeof locale, string>>> = {
    risk_analysis: {
      en: "Career risk analysis",
      fa: "تحلیل ریسک شغلی",
      ar: "تحليل المخاطر المهنية",
      es: "Análisis de riesgo profesional",
      fr: "Analyse du risque professionnel",
      de: "Karriere-Risikoanalyse",
      hi: "करियर जोखिम विश्लेषण",
    },
    skill_gap: {
      en: "Skill gap",
      fa: "شکاف مهارتی",
      ar: "فجوة المهارات",
      es: "Brecha de habilidades",
      fr: "Écart de compétences",
      de: "Skill-Lücke",
      hi: "कौशल अंतराल",
    },
    career_transition: {
      en: "Career transition",
      fa: "انتقال شغلی",
      ar: "الانتقال المهني",
      es: "Transición profesional",
      fr: "Transition professionnelle",
      de: "Karrierewechsel",
      hi: "करियर संक्रमण",
    },
    salary_guidance: {
      en: "Salary guidance",
      fa: "راهنمای حقوق",
      ar: "إرشادات الراتب",
      es: "Orientación salarial",
      fr: "Conseils salariaux",
      de: "Gehaltsberatung",
      hi: "वेतन मार्गदर्शन",
    },
    interview_prep: {
      en: "Interview preparation",
      fa: "آماده‌سازی مصاحبه",
      ar: "التحضير للمقابلة",
      es: "Preparación de entrevista",
      fr: "Préparation d'entretien",
      de: "Interview-Vorbereitung",
      hi: "साक्षात्कार तैयारी",
    },
    resume_advice: {
      en: "Resume advice",
      fa: "مشاوره رزومه",
      ar: "نصائح السيرة الذاتية",
      es: "Consejos de CV",
      fr: "Conseils CV",
      de: "Lebenslauf-Beratung",
      hi: "रेज़्यूमे सलाह",
    },
    migration: {
      en: "Migration options",
      fa: "گزینه‌های مهاجرت",
      ar: "خيارات الهجرة",
      es: "Opciones de migración",
      fr: "Options de migration",
      de: "Migrationsoptionen",
      hi: "प्रवास विकल्प",
    },
    job_search: {
      en: "Job search",
      fa: "جستجوی شغل",
      ar: "البحث عن عمل",
      es: "Búsqueda de empleo",
      fr: "Recherche d'emploi",
      de: "Jobsuche",
      hi: "नौकरी खोज",
    },
    general: {
      en: "General",
      fa: "عمومی",
      ar: "عام",
      es: "General",
      fr: "Général",
      de: "Allgemein",
      hi: "सामान्य",
    },
  };
  return table[intent]?.[locale] || table[intent].en || intent;
}
