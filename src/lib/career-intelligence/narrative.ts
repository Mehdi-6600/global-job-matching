/**
 * Narrative composer for career-intelligence outputs.
 *
 * Goal: produce sentences that read as if written by a native speaker
 * in each locale — not as an English sentence with translated slots.
 *
 * Design:
 *  - Every narrative unit is a small function per locale.
 *  - Shared segment builders cover common shapes (place, role, years).
 *  - The composer picks a "voice" deterministically from a seed so the
 *    same profile does not always produce the same opening clause.
 *
 * This module does NOT hit the network. It is pure and synchronous.
 */
import type { CareerRiskLocale } from "@/types/career-risk";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type NarrativeSlot =
  | "role"
  | "target"
  | "place"
  | "years"
  | "seniority"
  | "industry"
  | "skillCount";

export type NarrativeVars = Partial<Record<NarrativeSlot, string>>;

export type NarrativeLanguage = CareerRiskLocale;

/* ------------------------------------------------------------------ */
/* Voice selection (deterministic)                                    */
/* ------------------------------------------------------------------ */

/**
 * A stable 32-bit hash of a string — used only to pick a voice variant
 * deterministically, so tests stay reproducible.
 */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickVariant<T>(seed: string, variants: readonly T[]): T {
  if (variants.length === 0) {
    throw new Error("pickVariant: empty variant list");
  }
  return variants[stableHash(seed) % variants.length];
}

/* ------------------------------------------------------------------ */
/* Place formatting                                                   */
/* ------------------------------------------------------------------ */

/**
 * Join a city and country using locale-appropriate punctuation.
 * Persian and Arabic use the Arabic comma "،".
 */
export function formatPlace(
  locale: NarrativeLanguage,
  parts: Array<string | null | undefined>,
): string {
  const cleaned = parts.map((p) => (p || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  const sep = locale === "fa" || locale === "ar" ? "، " : ", ";
  return cleaned.join(sep);
}

/* ------------------------------------------------------------------ */
/* Year phrasing                                                      */
/* ------------------------------------------------------------------ */

export function formatYears(
  locale: NarrativeLanguage,
  years: number | null,
): string {
  if (years == null) {
    switch (locale) {
      case "fa":
        return "بدون تجربه اعلام‌شده";
      case "ar":
        return "دون سنوات خبرة معلنة";
      case "es":
        return "sin experiencia indicada";
      case "fr":
        return "sans expérience précisée";
      case "de":
        return "ohne angegebene Berufserfahrung";
      case "hi":
        return "अनुभव निर्दिष्ट नहीं";
      default:
        return "experience not specified";
    }
  }
  switch (locale) {
    case "fa":
      return `${years} سال تجربه`;
    case "ar":
      return `${years} سنوات خبرة`;
    case "es":
      return `${years} años de experiencia`;
    case "fr":
      return `${years} ans d'expérience`;
    case "de":
      return `${years} Jahre Erfahrung`;
    case "hi":
      return `${years} वर्ष का अनुभव`;
    default:
      return `${years} years of experience`;
  }
}

/* ------------------------------------------------------------------ */
/* Seniority phrasing                                                 */
/* ------------------------------------------------------------------ */

export type SeniorityLabel =
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager"
  | "unknown";

export function formatSeniority(
  locale: NarrativeLanguage,
  seniority: SeniorityLabel,
): string {
  const tables: Record<SeniorityLabel, Partial<Record<NarrativeLanguage, string>>> = {
    junior: {
      en: "junior",
      fa: "جوان / مبتدی",
      ar: "مبتدئ",
      es: "junior",
      fr: "junior",
      de: "Junior",
      hi: "जूनियर",
    },
    mid: {
      en: "mid-level",
      fa: "میان‌سطح",
      ar: "متوسط المستوى",
      es: "nivel medio",
      fr: "niveau intermédiaire",
      de: "mittleres Niveau",
      hi: "मध्य स्तर",
    },
    senior: {
      en: "senior",
      fa: "ارشد",
      ar: "خبير",
      es: "senior",
      fr: "senior",
      de: "Senior",
      hi: "वरिष्ठ",
    },
    lead: {
      en: "lead",
      fa: "سرپرست",
      ar: "قائد",
      es: "líder",
      fr: "lead",
      de: "Lead",
      hi: "लीड",
    },
    manager: {
      en: "manager",
      fa: "مدیر",
      ar: "مدير",
      es: "gerente",
      fr: "manager",
      de: "Manager",
      hi: "मैनेजर",
    },
    unknown: {
      en: "professional",
      fa: "حرفه‌ای",
      ar: "محترف",
      es: "profesional",
      fr: "professionnel",
      de: "Fachkraft",
      hi: "पेशेवर",
    },
  };
  return tables[seniority]?.[locale] || tables[seniority].en || seniority;
}

/* ------------------------------------------------------------------ */
/* Slot substitution                                                  */
/* ------------------------------------------------------------------ */

const SLOT_RE = /\{(\w+)\}/g;

export function interpolate(
  template: string,
  vars: NarrativeVars,
): string {
  return template.replace(SLOT_RE, (_, key: string) => {
    const v = vars[key as NarrativeSlot];
    return v != null ? String(v) : `{${key}}`;
  });
}

/* ------------------------------------------------------------------ */
/* Opening clause builders                                            */
/* ------------------------------------------------------------------ */

/**
 * A neutral, profile-aware opening clause. Never invents facts.
 */
export function openingClause(
  locale: NarrativeLanguage,
  profile: { currentRole: string; seniority: SeniorityLabel },
  seed: string,
): string {
  const role = profile.currentRole;
  const sen = formatSeniority(locale, profile.seniority);

  const variants = {
    en: [
      `As a ${sen} ${role}`,
      `In your current ${role} role`,
      `Given your position as a ${sen} ${role}`,
    ],
    fa: [
      `به‌عنوان ${sen} ${role}`,
      `در نقش فعلی ${role}`,
      `با توجه به جایگاه شما به‌عنوان ${sen} ${role}`,
    ],
    ar: [
      `بصفتك ${sen} ${role}`,
      `في دورك الحالي كـ${role}`,
      `بالنظر إلى موقعك ${sen} ${role}`,
    ],
    es: [
      `Como ${sen} ${role}`,
      `En tu rol actual de ${role}`,
      `Dado tu puesto actual de ${sen} ${role}`,
    ],
    fr: [
      `En tant que ${sen} ${role}`,
      `Dans votre rôle actuel de ${role}`,
      `Compte tenu de votre poste de ${sen} ${role}`,
    ],
    de: [
      `Als ${sen} ${role}`,
      `In Ihrer aktuellen Rolle als ${role}`,
      `Angesichts Ihrer Position als ${sen} ${role}`,
    ],
    hi: [
      `${sen} ${role} के रूप में`,
      `आपकी वर्तमान ${role} भूमिका में`,
      `${sen} ${role} के रूप में आपकी स्थिति को देखते हुए`,
    ],
  } as const;

  const pool = variants[locale] || variants.en;
  return pickVariant(seed, pool);
}

/* ------------------------------------------------------------------ */
/* Reason phrasings (used by Career Risk)                             */
/* ------------------------------------------------------------------ */

/**
 * Describe a task's automation exposure naturally.
 * Task labels are passed in already-localized by the caller.
 */
export function reasonAutomation(
  locale: NarrativeLanguage,
  params: { label: string; pct: number },
): string {
  const { label, pct } = params;
  const tables: Record<NarrativeLanguage, string[]> = {
    en: [
      `The task "${label}" carries roughly ${pct}% automation exposure.`,
      `"${label}" shows about ${pct}% automation pressure.`,
      `Automation risk concentrates on "${label}" (~${pct}%).`,
    ],
    fa: [
      `کار «${label}» حدود ${pct}٪ در معرض اتوماسیون است.`,
      `«${label}» حدود ${pct}٪ فشار اتوماسیون دارد.`,
      `ریسک اتوماسیون بیشتر روی «${label}» متمرکز است (حدود ${pct}٪).`,
    ],
    ar: [
      `المهمة «${label}» معرضة للأتمتة بنسبة ${pct}٪ تقريباً.`,
      `تُظهر «${label}» ضغط أتمتة بنحو ${pct}٪.`,
      `يتركز خطر الأتمتة على «${label}» (~${pct}٪).`,
    ],
    es: [
      `La tarea «${label}» tiene ~${pct}% de exposición a automatización.`,
      `«${label}» muestra ~${pct}% de presión de automatización.`,
      `El riesgo de automatización se concentra en «${label}» (~${pct}%).`,
    ],
    fr: [
      `La tâche «${label}» présente ~${pct}% d'exposition à l'automatisation.`,
      `«${label}» affiche ~${pct}% de pression d'automatisation.`,
      `Le risque d'automatisation se concentre sur «${label}» (~${pct}%).`,
    ],
    de: [
      `Die Aufgabe „${label}“ hat ca. ${pct}% Automatisierungsexposition.`,
      `„${label}“ zeigt ca. ${pct}% Automatisierungsdruck.`,
      `Automatisierungsrisiko konzentriert sich auf „${label}“ (~${pct}%).`,
    ],
    hi: [
      `कार्य «${label}» में लगभग ${pct}% स्वचालन जोखिम है।`,
      `«${label}» में लगभग ${pct}% स्वचालन दबाव दिखता है।`,
      `स्वचालन जोखिम «${label}» पर केंद्रित है (~${pct}%)।`,
    ],
  };
  const pool = tables[locale] || tables.en;
  return pickVariant(`${locale}:auto:${label}:${pct}`, pool);
}

export function reasonResilience(
  locale: NarrativeLanguage,
  params: { label: string; judgment: number },
): string {
  const { label, judgment } = params;
  const tables: Record<NarrativeLanguage, string[]> = {
    en: [
      `"${label}" still depends on judgment (~${judgment}%) and is harder to automate.`,
      `Resilience shows up in "${label}" where judgment dominates (~${judgment}%).`,
      `"${label}" remains judgment-heavy (~${judgment}%) and less replaceable.`,
    ],
    fa: [
      `«${label}» هنوز به قضاوت انسانی وابسته است (حدود ${judgment}٪) و کمتر جایگزین‌پذیر است.`,
      `مقاومت در «${label}» دیده می‌شود، جایی که قضاوت غالب است (حدود ${judgment}٪).`,
      `«${label}» همچنان قضاوت‌محور است (حدود ${judgment}٪) و کمتر قابل جایگزینی.`,
    ],
    ar: [
      `«${label}» لا يزال يعتمد على الحكم (~${judgment}٪) ويصعب أتمتته.`,
      `تظهر المرونة في «${label}» حيث يغلب الحكم (~${judgment}٪).`,
      `«${label}» لا يزال معتمداً على الحكم (~${judgment}٪) وأقل قابلية للاستبدال.`,
    ],
    es: [
      `«${label}» aún depende del juicio (~${judgment}%) y es más difícil de automatizar.`,
      `La resiliencia aparece en «${label}» donde domina el juicio (~${judgment}%).`,
      `«${label}» sigue siendo intensivo en juicio (~${judgment}%) y menos reemplazable.`,
    ],
    fr: [
      `«${label}» dépend encore du jugement (~${judgment}%) et est plus difficile à automatiser.`,
      `La résilience apparaît dans «${label}» où le jugement domine (~${judgment}%).`,
      `«${label}» reste à fort jugement (~${judgment}%) et moins remplaçable.`,
    ],
    de: [
      `„${label}“ hängt weiterhin von Urteilsvermögen ab (~${judgment}%) und ist schwerer zu automatisieren.`,
      `Resilienz zeigt sich bei „${label}“, wo Urteil dominiert (~${judgment}%).`,
      `„${label}“ bleibt urteilsintensiv (~${judgment}%) und schwerer ersetzbar.`,
    ],
    hi: [
      `«${label}» अभी भी निर्णय पर निर्भर है (~${judgment}%) और स्वचालित करना कठिन है।`,
      `«${label}» में लचीलापन दिखता है जहाँ निर्णय प्रमुख है (~${judgment}%)।`,
      `«${label}» अभी भी निर्णय-केंद्रित (~${judgment}%) और कम प्रतिस्थापनीय है।`,
    ],
  };
  const pool = tables[locale] || tables.en;
  return pickVariant(`${locale}:res:${label}:${judgment}`, pool);
}

/* ------------------------------------------------------------------ */
/* Closing line                                                       */
/* ------------------------------------------------------------------ */

export function disclaimerLine(locale: NarrativeLanguage): string {
  const tables: Record<NarrativeLanguage, string> = {
    en: "This is an offline estimate, not specialist advice.",
    fa: "این یک تخمین آفلاین است، نه مشاوره تخصصی.",
    ar: "هذا تقدير دون اتصال، وليس استشارة متخصصة.",
    es: "Esta es una estimación offline, no asesoramiento especializado.",
    fr: "Ceci est une estimation hors-ligne, pas un conseil spécialisé.",
    de: "Dies ist eine Offline-Schätzung, keine Fachberatung.",
    hi: "यह एक ऑफ़लाइन अनुमान है, विशेषज्ञ सलाह नहीं।",
  };
  return tables[locale] || tables.en;
}

/* ------------------------------------------------------------------ */
/* Anti-repetition dedup                                              */
/* ------------------------------------------------------------------ */

/**
 * Deduplicate a list of sentences while preserving order.
 * Used to avoid adjacent identical reasons in a single response.
 */
export function uniqueSentences(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}
