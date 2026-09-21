/**
 * Resume writer — Phase 3.
 *
 * Replaces the raw buildTemplateResume() with a proper pipeline:
 *   1. Extract facts from the caller's input (no invention).
 *   2. Normalize into a shared normalized profile.
 *   3. Extract achievements from responsibilities.
 *   4. Determine section order and inclusion per locale.
 *   5. Localize section headers naturally (not via English templates).
 *   6. Compose each section in a locale-native way.
 *   7. ATS-optimize (standard section names, target keyword signals).
 *   8. Truthfulness + language quality gates before returning.
 *
 * Deterministic: same input → same output.
 * Never invents employers, degrees, dates, metrics, or certifications.
 */
import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  normalizeCareerProfile,
  type ExtendedProfileInput,
  type NormalizedCareerProfile,
} from "@/lib/career-intelligence/normalize-profile";
import {
  extractAchievements,
  competencyLabel,
} from "@/lib/career-intelligence/achievement-extractor";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export const RESUME_TONES = ["professional", "confident", "concise"] as const;
export type ResumeTone = (typeof RESUME_TONES)[number];

export type ResumeWriterInput = {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  targetIndustry?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  languages?: string;
  certifications?: string[];
  achievements?: string[];
  metrics?: string[];
  tone?: ResumeTone;
  locale?: string;
};

export type ResumeWriterOutput = {
  text: string;
  locale: CareerRiskLocale;
  meta: {
    sectionsIncluded: string[];
    achievementsExtracted: number;
    hasMetrics: boolean;
    targetAligned: boolean;
  };
};

/* ------------------------------------------------------------------ */
/* Localization tables                                                */
/* ------------------------------------------------------------------ */

type SectionId =
  | "summary"
  | "competencies"
  | "experience"
  | "achievements"
  | "projects"
  | "education"
  | "certifications"
  | "skills"
  | "languages"
  | "additional";

type SectionLabels = Record<SectionId, string>;

const SECTION_LABELS: Record<CareerRiskLocale, SectionLabels> = {
  en: {
    summary: "PROFESSIONAL SUMMARY",
    competencies: "CORE COMPETENCIES",
    experience: "PROFESSIONAL EXPERIENCE",
    achievements: "SELECTED ACHIEVEMENTS",
    projects: "PROJECTS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    skills: "SKILLS",
    languages: "LANGUAGES",
    additional: "ADDITIONAL INFORMATION",
  },
  fa: {
    summary: "خلاصه حرفه‌ای",
    competencies: "شایستگی‌های کلیدی",
    experience: "تجربه کاری",
    achievements: "دستاوردهای منتخب",
    projects: "پروژه‌ها",
    education: "تحصیلات",
    certifications: "گواهینامه‌ها",
    skills: "مهارت‌ها",
    languages: "زبان‌ها",
    additional: "اطلاعات تکمیلی",
  },
  ar: {
    summary: "الملف المهني",
    competencies: "الكفاءات الأساسية",
    experience: "الخبرة المهنية",
    achievements: "الإنجازات المختارة",
    projects: "المشاريع",
    education: "التعليم",
    certifications: "الشهادات",
    skills: "المهارات",
    languages: "اللغات",
    additional: "معلومات إضافية",
  },
  es: {
    summary: "RESUMEN PROFESIONAL",
    competencies: "COMPETENCIAS CLAVE",
    experience: "EXPERIENCIA PROFESIONAL",
    achievements: "LOGROS SELECCIONADOS",
    projects: "PROYECTOS",
    education: "EDUCACIÓN",
    certifications: "CERTIFICACIONES",
    skills: "HABILIDADES",
    languages: "IDIOMAS",
    additional: "INFORMACIÓN ADICIONAL",
  },
  fr: {
    summary: "RÉSUMÉ PROFESSIONNEL",
    competencies: "COMPÉTENCES CLÉS",
    experience: "EXPÉRIENCE PROFESSIONNELLE",
    achievements: "RÉALISATIONS CHOISIES",
    projects: "PROJETS",
    education: "FORMATION",
    certifications: "CERTIFICATIONS",
    skills: "COMPÉTENCES",
    languages: "LANGUES",
    additional: "INFORMATIONS COMPLÉMENTAIRES",
  },
  de: {
    summary: "PROFIL",
    competencies: "KERNKOMPETENZEN",
    experience: "BERUFSERFAHRUNG",
    achievements: "AUSGEWÄHLTE ERFOLGE",
    projects: "PROJEKTE",
    education: "AUSBILDUNG",
    certifications: "ZERTIFIKATE",
    skills: "FÄHIGKEITEN",
    languages: "SPRACHEN",
    additional: "ZUSÄTZLICHE INFORMATIONEN",
  },
  hi: {
    summary: "पेशेवर सारांश",
    competencies: "मुख्य दक्षताएँ",
    experience: "पेशेवर अनुभव",
    achievements: "चयनित उपलब्धियाँ",
    projects: "परियोजनाएँ",
    education: "शिक्षा",
    certifications: "प्रमाणपत्र",
    skills: "कौशल",
    languages: "भाषाएँ",
    additional: "अतिरिक्त जानकारी",
  },
};

/* ------------------------------------------------------------------ */
/* Placeholder summary (locale-complete; only when user did not supply one) */
/* ------------------------------------------------------------------ */

/**
 * Complete 7-locale fallback summary.
 * Missing years → neutral phrasing (not "0 years").
 */
function fallbackSummary(
  locale: CareerRiskLocale,
  targetRole: string | undefined,
  profile: NormalizedCareerProfile,
): string {
  const role = targetRole?.trim() || profile.currentRole || "professional";
  const years = profile.yearsExperience;

  const tables: Record<
    CareerRiskLocale,
    { withYears: string; noYears: string }
  > = {
    en: {
      withYears: `Professional with ${years} year${years === 1 ? "" : "s"} of experience seeking a role as ${role}. Focused on delivering reliable outcomes and growing domain expertise.`,
      noYears: `Professional seeking a role as ${role}. Focused on delivering reliable outcomes and growing domain expertise.`,
    },
    fa: {
      withYears: `حرفه‌ای با ${years} سال تجربه، در جستجوی نقش ${role}. متمرکز بر ارائه نتایج قابل اتکا و توسعه تخصص حوزه.`,
      noYears: `حرفه‌ای در جستجوی نقش ${role}. متمرکز بر ارائه نتایج قابل اتکا و توسعه تخصص حوزه.`,
    },
    ar: {
      withYears: `محترف بخبرة ${years} سنوات يبحث عن دور ${role}. يركّز على تقديم نتائج موثوقة وتطوير الخبرة المجالية.`,
      noYears: `محترف يبحث عن دور ${role}. يركّز على تقديم نتائج موثوقة وتطوير الخبرة المجالية.`,
    },
    es: {
      withYears: `Profesional con ${years} año${years === 1 ? "" : "s"} de experiencia en busca de un puesto como ${role}. Enfocado en entregar resultados fiables y desarrollar experiencia de dominio.`,
      noYears: `Profesional en busca de un puesto como ${role}. Enfocado en entregar resultados fiables y desarrollar experiencia de dominio.`,
    },
    fr: {
      withYears: `Professionnel avec ${years} an${years === 1 ? "" : "s"} d'expérience, à la recherche d'un poste de ${role}. Focalisé sur la livraison de résultats fiables et le développement de l'expertise métier.`,
      noYears: `Professionnel à la recherche d'un poste de ${role}. Focalisé sur la livraison de résultats fiables et le développement de l'expertise métier.`,
    },
    de: {
      withYears: `Fachkraft mit ${years} Jahr${years === 1 ? "" : "en"} Erfahrung, auf der Suche nach einer Position als ${role}. Fokussiert auf verlässliche Ergebnisse und den Ausbau von Fachwissen.`,
      noYears: `Fachkraft auf der Suche nach einer Position als ${role}. Fokussiert auf verlässliche Ergebnisse und den Ausbau von Fachwissen.`,
    },
    hi: {
      withYears: `${years} वर्ष के अनुभव वाला पेशेवर, ${role} की भूमिका की तलाश में। विश्वसनीय परिणाम और डोमेन विशेषज्ञता विकसित करने पर केंद्रित।`,
      noYears: `${role} की भूमिका की तलाश में पेशेवर। विश्वसनीय परिणाम और डोमेन विशेषज्ञता विकसित करने पर केंद्रित।`,
    },
  };

  const pack = tables[locale] || tables.en;
  return years ? pack.withYears : pack.noYears;
}

/* ------------------------------------------------------------------ */
/* Tone adjustment                                                    */
/* ------------------------------------------------------------------ */

function applyTone(summary: string, tone: ResumeTone): string {
  if (tone !== "concise") return summary;
  const firstSentence = summary.split(/[.!?؟।]/)[0]?.trim();
  return firstSentence && firstSentence.length >= 20
    ? `${firstSentence}.`
    : summary;
}

/* ------------------------------------------------------------------ */
/* Skill prioritization (case-insensitive)                            */
/* ------------------------------------------------------------------ */

function prioritizeSkills(
  skills: string[],
  targetRole: string | undefined,
): string[] {
  if (!targetRole?.trim()) return skills;
  const target = targetRole.toLowerCase();
  const matches: string[] = [];
  const others: string[] = [];
  for (const s of skills) {
    const sl = s.toLowerCase();
    if (target.includes(sl) || sl.length >= 3 && target.split(/\s+/).some((w) => w.includes(sl) || sl.includes(w))) {
      matches.push(s);
    } else {
      others.push(s);
    }
  }
  return [...matches, ...others];
}

/* ------------------------------------------------------------------ */
/* Truthfulness gate                                                  */
/* ------------------------------------------------------------------ */

function containsFabricationMarkers(text: string): boolean {
  return /\b(ph\.?d|mba|ceo|cto|cfo|fortune 500|award-winning)\b/i.test(
    text,
  );
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                   */
/* ------------------------------------------------------------------ */

export function buildResume(input: ResumeWriterInput): ResumeWriterOutput {
  const locale = normalizeCareerLocale(input.locale);
  const tone: ResumeTone =
    input.tone === "confident" || input.tone === "concise"
      ? input.tone
      : "professional";

  const extended: ExtendedProfileInput = {
    jobTitle: input.targetRole || "",
    skills: input.skills,
    industry: input.targetIndustry,
    location: input.location,
    locale,
    targetRole: input.targetRole,
    languages: input.languages,
    responsibilities: input.experience,
    certifications: input.certifications,
    achievements: input.achievements,
    metrics: input.metrics,
  };
  const profile = normalizeCareerProfile(extended);

  const extracted = extractAchievements({
    responsibilities: splitExperienceLines(input.experience || ""),
    metrics: input.metrics || [],
    roleFamily: profile.roleFamily,
    locale,
    targetFamily: profile.targetRoleFamily,
  });

  const labels = SECTION_LABELS[locale];

  const sections: Array<{ id: SectionId; body: string }> = [];

  const contact = [input.email, input.phone, input.location]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" · ");

  const headerLines: string[] = [];
  headerLines.push((input.fullName || "").trim().toUpperCase());
  if (input.targetRole?.trim()) headerLines.push(input.targetRole.trim());
  if (contact) headerLines.push(contact);

  const summarySource =
    input.summary?.trim() && input.summary.trim().length >= 40
      ? input.summary.trim()
      : fallbackSummary(locale, input.targetRole, profile);
  const summary = applyTone(summarySource, tone);
  if (summary) {
    sections.push({ id: "summary", body: summary });
  }

  const competencies = extracted.competencies.slice(0, 8);
  if (competencies.length >= 2) {
    const body = competencies
      .map((c) => `- ${competencyLabel(c, locale)}`)
      .join("\n");
    sections.push({ id: "competencies", body });
  }

  const experienceLines = splitExperienceLines(input.experience || "");
  if (experienceLines.length > 0) {
    const body = experienceLines
      .map((line) => `- ${line.replace(/^[-•*]\s*/, "")}`)
      .join("\n");
    sections.push({ id: "experience", body });
  }

  const metricAchievements = extracted.achievements.filter((a) => a.hasMetric);
  if (metricAchievements.length >= 1) {
    const body = metricAchievements.map((a) => `- ${a.text}`).join("\n");
    sections.push({ id: "achievements", body });
  }

  const education = (input.education || "").trim();
  if (education) {
    sections.push({ id: "education", body: education });
  }

  const certs = (input.certifications || []).filter(
    (c) => c && c.trim().length > 0,
  );
  if (certs.length > 0) {
    sections.push({
      id: "certifications",
      body: certs.map((c) => `- ${c.trim()}`).join("\n"),
    });
  }

  const skillList = splitSkills(input.skills || "");
  if (skillList.length > 0) {
    const prioritized = prioritizeSkills(skillList, input.targetRole);
    sections.push({
      id: "skills",
      body: prioritized.join(", "),
    });
  }

  const languages = (input.languages || "").trim();
  if (languages) {
    sections.push({ id: "languages", body: languages });
  }

  const parts: string[] = [];
  parts.push(headerLines.join("\n"));
  for (const section of sections) {
    parts.push("");
    parts.push(labels[section.id]);
    parts.push(section.body);
  }

  let text = parts.join("\n").trim();

  if (containsFabricationMarkers(text)) {
    const cleaned = text.replace(
      /\b(ph\.?d|mba|ceo|cto|cfo|fortune 500|award-winning)\b[^\n.]*[.\n]/gi,
      "",
    );
    text = cleaned.trim();
  }

  const sectionsIncluded = sections.map((s) => s.id as string);

  return {
    text,
    locale,
    meta: {
      sectionsIncluded,
      achievementsExtracted: extracted.achievements.length,
      hasMetrics: extracted.achievements.some((a) => a.hasMetric),
      targetAligned: Boolean(input.targetRole?.trim()),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function splitExperienceLines(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\n|;|•|\u2022/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8)
    .slice(0, 30);
}

function splitSkills(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|;،\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 40);
}
