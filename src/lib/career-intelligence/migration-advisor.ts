/**
 * Migration advisor — Phase 4.
 *
 * Replaces the static per-family country list with a personalized
 * scoring pipeline that uses the normalized profile.
 *
 * Hard rules:
 *  - Never claims a specific legal pathway currently exists.
 *  - Never invents visa rules, quotas, points, or eligibility.
 *  - Always labels the output as general guidance, not legal advice.
 *  - Deterministic: same input → same output.
 *
 * Output shape matches the existing OfflineMigration type so the API
 * endpoint keeps working without changes.
 */
import type { CareerRiskLocale } from "@/types/career-risk";
import {
  normalizeCareerProfile,
  type ExtendedProfileInput,
  type NormalizedCareerProfile,
} from "@/lib/career-intelligence/normalize-profile";
import { formatPlace } from "@/lib/career-intelligence/narrative";

/* ------------------------------------------------------------------ */
/* Public types (compatible with existing OfflineMigration)           */
/* ------------------------------------------------------------------ */

export type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

export type OfflineMigrationResult = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  caveats: string[];
  source: "heuristic";
};

export type MigrationAdvisorInput = ExtendedProfileInput & {
  jobTitle: string;
  skills?: string;
  country?: string;
  location?: string;
  targetRole?: string;
};

/* ------------------------------------------------------------------ */
/* Country profiles (factual, non-legal)                              */
/* ------------------------------------------------------------------ */

/**
 * A country profile is metadata about the labor market and the
 * general *kinds* of pathways that are commonly discussed in public
 * sources. It does NOT assert current visa rules, quotas, or scores.
 */
type CountryProfile = {
  name: string;
  /** Region for mobility clustering. */
  region: "eu" | "na" | "uk" | "apac" | "mea" | "latam";
  /** Languages commonly expected in professional roles. */
  languages: string[];
  /** Families that typically have stronger demand. */
  strongFamilies: Array<NormalizedCareerProfile["roleFamily"]>;
  /** General framing of common pathway categories (not legal claims). */
  pathwayCategories: Array<
    | "employment"
    | "skilled"
    | "study"
    | "sponsorship"
    | "remote"
    | "recognition"
  >;
};

const COUNTRY_PROFILES: CountryProfile[] = [
  {
    name: "Germany",
    region: "eu",
    languages: ["german", "english"],
    strongFamilies: [
      "software_engineering",
      "data",
      "healthcare",
      "trades",
      "accounting_finance",
      "design",
    ],
    pathwayCategories: ["skilled", "employment", "study", "recognition"],
  },
  {
    name: "Netherlands",
    region: "eu",
    languages: ["english", "dutch"],
    strongFamilies: [
      "software_engineering",
      "data",
      "design",
      "sales_marketing",
    ],
    pathwayCategories: ["skilled", "employment", "remote"],
  },
  {
    name: "Canada",
    region: "na",
    languages: ["english", "french"],
    strongFamilies: [
      "software_engineering",
      "data",
      "healthcare",
      "education",
      "trades",
      "accounting_finance",
    ],
    pathwayCategories: ["skilled", "employment", "study", "recognition"],
  },
  {
    name: "United States",
    region: "na",
    languages: ["english"],
    strongFamilies: [
      "software_engineering",
      "data",
      "design",
      "sales_marketing",
      "management",
    ],
    pathwayCategories: ["employment", "sponsorship", "study"],
  },
  {
    name: "United Kingdom",
    region: "uk",
    languages: ["english"],
    strongFamilies: [
      "software_engineering",
      "data",
      "healthcare",
      "accounting_finance",
      "management",
    ],
    pathwayCategories: ["skilled", "employment", "study"],
  },
  {
    name: "Ireland",
    region: "eu",
    languages: ["english"],
    strongFamilies: [
      "software_engineering",
      "data",
      "accounting_finance",
    ],
    pathwayCategories: ["employment", "skilled"],
  },
  {
    name: "Australia",
    region: "apac",
    languages: ["english"],
    strongFamilies: [
      "healthcare",
      "trades",
      "software_engineering",
      "education",
    ],
    pathwayCategories: ["skilled", "employment", "recognition"],
  },
  {
    name: "United Arab Emirates",
    region: "mea",
    languages: ["english", "arabic"],
    strongFamilies: [
      "accounting_finance",
      "sales_marketing",
      "management",
      "operations_clerical",
      "design",
    ],
    pathwayCategories: ["employment", "sponsorship"],
  },
  {
    name: "Turkey",
    region: "mea",
    languages: ["turkish", "english"],
    strongFamilies: [
      "software_engineering",
      "trades",
      "sales_marketing",
    ],
    pathwayCategories: ["employment", "remote"],
  },
  {
    name: "Sweden",
    region: "eu",
    languages: ["english", "swedish"],
    strongFamilies: [
      "software_engineering",
      "data",
      "design",
    ],
    pathwayCategories: ["skilled", "employment"],
  },
];

/* ------------------------------------------------------------------ */
/* Scoring                                                            */
/* ------------------------------------------------------------------ */

type Scored = {
  profile: CountryProfile;
  score: number;
  reasons: string[];
};

/**
 * Score a country profile against a normalized career profile.
 *
 * Score is 0–100 and deterministic. Higher is better on career-fit
 * grounds (family demand, language compatibility, mobility signals).
 * It is NOT a probability of acceptance.
 */
function scoreCountry(
  country: CountryProfile,
  profile: NormalizedCareerProfile,
): Scored {
  let score = 40;
  const reasons: string[] = [];

  // 1. Family demand
  const familyMatch = country.strongFamilies.includes(profile.roleFamily);
  const targetMatch =
    profile.targetRoleFamily != null &&
    country.strongFamilies.includes(profile.targetRoleFamily);
  if (familyMatch) {
    score += 18;
    reasons.push("family_demand");
  }
  if (targetMatch) {
    score += 12;
    reasons.push("target_family_demand");
  }

  // 2. Language compatibility
  const userLangs = profile.languages.map((l) => l.toLowerCase());
  const langMatch = country.languages.some((c) =>
    userLangs.some((u) => u.includes(c) || c.includes(u)),
  );
  if (langMatch) {
    score += 10;
    reasons.push("language_match");
  } else {
    score -= 6;
  }

  // 3. Mobility signals from extended profile
  if (profile.willingnessToStudy === true) score += 6;
  if (profile.existingOffers.length > 0) score += 10;
  if (profile.financialConstraint === "high") score += 8;
  else if (profile.financialConstraint === "low") score -= 8;

  // 4. Age is only used as a soft signal for study pathways — never
  // as a hard cutoff, since that would be discriminatory.
  if (profile.age != null && profile.willingnessToStudy === true) {
    if (profile.age <= 30) score += 4;
  }

  // 5. Target readiness improves fit
  if (profile.signals.targetReadiness >= 60) score += 6;

  // 6. Current country match → mild preference for staying (already there)
  if (
    profile.country &&
    country.name.toLowerCase().includes(profile.country.toLowerCase())
  ) {
    score += 5;
    reasons.push("already_local");
  }

  return {
    profile: country,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

/* ------------------------------------------------------------------ */
/* Localized output builders                                          */
/* ------------------------------------------------------------------ */

function demandLine(
  locale: CareerRiskLocale,
  country: CountryProfile,
  profile: NormalizedCareerProfile,
): string {
  const roleFamily = profile.roleFamily;
  const hasMatch = country.strongFamilies.includes(roleFamily);

  const tables: Record<CareerRiskLocale, string> = {
    en: hasMatch
      ? `${roleFamily.replace(/_/g, " ")} roles typically show steady demand.`
      : `Your field is less directly aligned; consider transferable skills.`,
    fa: hasMatch
      ? `نقش‌های ${roleFamily.replace(/_/g, " ")} معمولاً تقاضای پایدار دارند.`
      : `حوزه شما انطباق مستقیم کمتری دارد؛ بر مهارت‌های قابل انتقال تمرکز کنید.`,
    ar: hasMatch
      ? `عادةً ما تشهد أدوار ${roleFamily.replace(/_/g, " ")} طلباً مستقراً.`
      : `مجالك أقل تطابقاً مباشراً؛ فكّر في المهارات القابلة للنقل.`,
    es: hasMatch
      ? `Los roles de ${roleFamily.replace(/_/g, " ")} suelen mostrar demanda estable.`
      : `Tu campo está menos alineado; considera habilidades transferibles.`,
    fr: hasMatch
      ? `Les rôles de ${roleFamily.replace(/_/g, " ")} montrent généralement une demande stable.`
      : `Votre domaine est moins directement aligné ; envisagez des compétences transférables.`,
    de: hasMatch
      ? `Rollen im Bereich ${roleFamily.replace(/_/g, " ")} zeigen meist stabile Nachfrage.`
      : `Ihr Feld passt weniger direkt; übertragbare Fähigkeiten prüfen.`,
    hi: hasMatch
      ? `${roleFamily.replace(/_/g, " ")} भूमिकाओं में सामान्यतः स्थिर मांग रहती है।`
      : `आपका क्षेत्र कम सीधे मेल खाता है; हस्तांतरणीय कौशल पर विचार करें।`,
  };
  return tables[locale] || tables.en;
}

function pathwayLine(
  locale: CareerRiskLocale,
  country: CountryProfile,
): string {
  const cats = country.pathwayCategories.join(", ");
  const tables: Record<CareerRiskLocale, string> = {
    en: `General pathway categories publicly discussed: ${cats}. Verify current rules with official sources.`,
    fa: `دسته‌های عمومی مسیر که به‌طور عمومی مطرح می‌شوند: ${cats}. قوانین روز را از منابع رسمی بررسی کنید.`,
    ar: `فئات المسارات العامة المطروحة علناً: ${cats}. تحقق من القواعد الحالية في المصادر الرسمية.`,
    es: `Categorías generales de rutas mencionadas públicamente: ${cats}. Verifica las reglas vigentes con fuentes oficiales.`,
    fr: `Catégories générales de parcours évoquées publiquement : ${cats}. Vérifiez les règles actuelles auprès des sources officielles.`,
    de: `Öffentlich diskutierte allgemeine Wegekategorien: ${cats}. Aktuelle Regeln bei offiziellen Quellen prüfen.`,
    hi: `सार्वजनिक रूप से चर्चित सामान्य मार्ग श्रेणियाँ: ${cats}. वर्तमान नियम आधिकारिक स्रोतों से जाँचें।`,
  };
  return tables[locale] || tables.en;
}

function notesLine(
  locale: CareerRiskLocale,
  country: CountryProfile,
  profile: NormalizedCareerProfile,
): string {
  const place = formatPlace(locale, [
    profile.location || null,
    profile.country || null,
  ]);
  const hasLang = country.languages.some((c) =>
    profile.languages.some((l) => l.toLowerCase().includes(c)),
  );

  const tables: Record<CareerRiskLocale, string> = {
    en: hasLang
      ? `Your language profile (${profile.languages.join(", ") || "—"}) aligns with common expectations${place ? ` from ${place}` : ""}.`
      : `Language expectations in ${country.name} often include ${country.languages.join(" or ")}; plan accordingly${place ? ` from ${place}` : ""}.`,
    fa: hasLang
      ? `پروفایل زبانی شما (${profile.languages.join("، ") || "—"}) با انتظارات رایج هم‌راستاست${place ? ` از ${place}` : ""}.`
      : `انتظارات زبانی در ${country.name} معمولاً ${country.languages.join(" یا ")} است؛ برنامه‌ریزی کنید${place ? ` از ${place}` : ""}.`,
    ar: hasLang
      ? `ملف لغتك (${profile.languages.join("، ") || "—"}) متوافق مع التوقعات الشائعة${place ? ` من ${place}` : ""}.`
      : `التوقعات اللغوية في ${country.name} تشمل عادة ${country.languages.join(" أو ")}؛ خطط لذلك${place ? ` من ${place}` : ""}.`,
    es: hasLang
      ? `Tu perfil lingüístico (${profile.languages.join(", ") || "—"}) se alinea con las expectativas comunes${place ? ` desde ${place}` : ""}.`
      : `Las expectativas lingüísticas en ${country.name} suelen incluir ${country.languages.join(" o ")}; planifícalo${place ? ` desde ${place}` : ""}.`,
    fr: hasLang
      ? `Votre profil linguistique (${profile.languages.join(", ") || "—"}) correspond aux attentes courantes${place ? ` depuis ${place}` : ""}.`
      : `Les attentes linguistiques en ${country.name} incluent souvent ${country.languages.join(" ou ")} ; prévoyez-le${place ? ` depuis ${place}` : ""}.`,
    de: hasLang
      ? `Ihr Sprachprofil (${profile.languages.join(", ") || "—"}) passt zu üblichen Erwartungen${place ? ` aus ${place}` : ""}.`
      : `Spracherwartungen in ${country.name} umfassen oft ${country.languages.join(" oder ")}; planen Sie entsprechend${place ? ` aus ${place}` : ""}.`,
    hi: hasLang
      ? `आपकी भाषा प्रोफ़ाइल (${profile.languages.join(", ") || "—"}) सामान्य अपेक्षाओं से मेल खाती है${place ? ` ${place} से` : ""}।`
      : `${country.name} में भाषा अपेक्षाएँ अक्सर ${country.languages.join(" या ")} शामिल करती हैं; तदनुसार योजना बनाएँ${place ? ` ${place} से` : ""}।`,
  };
  return tables[locale] || tables.en;
}

/* ------------------------------------------------------------------ */
/* Summary + caveats                                                  */
/* ------------------------------------------------------------------ */

function buildSummary(
  locale: CareerRiskLocale,
  profile: NormalizedCareerProfile,
  topCountries: string[],
): string {
  const role = profile.currentRole;
  const countryList = topCountries.join(", ");

  const tables: Record<CareerRiskLocale, string> = {
    en: `Based on your profile as ${role}, the following destinations are relatively closer on career-fit grounds: ${countryList}. This is occupational guidance, not legal advice.`,
    fa: `بر اساس پروفایل شما به‌عنوان ${role}، این مقاصد از نظر تناسب شغلی منطقی‌ترند: ${countryList}. این ارزیابی تناسب شغلی است، نه مشاوره حقوقی.`,
    ar: `بناءً على ملفك كـ${role}، هذه الوجهات أقرب نسبياً من حيث الملاءمة المهنية: ${countryList}. هذا توجيه مهني وليس استشارة قانونية.`,
    es: `Según tu perfil como ${role}, estos destinos son relativamente más cercanos en términos de adecuación profesional: ${countryList}. Es orientación ocupacional, no asesoría legal.`,
    fr: `D'après votre profil de ${role}, ces destinations sont relativement plus proches en adéquation professionnelle : ${countryList}. Il s'agit d'orientation professionnelle, pas de conseil juridique.`,
    de: `Basierend auf Ihrem Profil als ${role} liegen diese Ziele hinsichtlich der beruflichen Eignung relativ näher: ${countryList}. Dies ist berufliche Orientierung, keine Rechtsberatung.`,
    hi: `${role} के रूप में आपकी प्रोफ़ाइल के आधार पर, ये गंतव्य करियर-उपयुक्तता के आधार पर अपेक्षाकृत निकट हैं: ${countryList}। यह व्यावसायिक मार्गदर्शन है, कानूनी सलाह नहीं।`,
  };
  return tables[locale] || tables.en;
}

function buildCaveats(locale: CareerRiskLocale): string[] {
  const tables: Record<CareerRiskLocale, string[]> = {
    en: [
      "This is an offline occupational-fit assessment, not immigration legal advice.",
      "Verify pathways visa rules, shortage lists, and language requirements only with official sources for that country.",
      "No guarantee of acceptance, points, or processing timelines is implied.",
    ],
    fa: [
      "این خروجی ارزیابی تناسب شغلی آفلاین است، نه مشاوره حقوقی مهاجرت.",
      "قوانین ویزا، لیست مشاغل کمبود و شرایط زبان را فقط از منابع رسمی همان کشور بررسی کنید.",
      "هیچ تضمینی برای پذیرش، امتیاز یا زمان‌بندی ویزا وجود ندارد.",
    ],
    ar: [
      "هذا تقييم offline للملاءمة المهنية، وليس استشارة قانونية للهجرة.",
      "تحقق من قواعد التأشيرة وقوائم المهن المطلوبة ومتطلبات اللغة من المصادر الرسمية فقط.",
      "لا يوجد ضمان للقبول أو النقاط أو مدد المعالجة.",
    ],
    es: [
      "Esta es una evaluación offline de adecuación ocupacional, no asesoría legal migratoria.",
      "Verifica reglas de visa, listas de escasez y requisitos de idioma solo con fuentes oficiales del país.",
      "No se garantiza aceptación, puntos ni plazos de tramitación.",
    ],
    fr: [
      "Ceci est une évaluation hors ligne d'adéquation professionnelle, pas un conseil juridique en immigration.",
      "Vérifiez les règles de visa, les listes de pénurie et les exigences linguistiques uniquement auprès des sources officielles du pays.",
      "Aucune garantie d'acceptation, de points ou de délais de traitement n'est implicite.",
    ],
    de: [
      "Dies ist eine Offline-Bewertung der beruflichen Eignung, keine rechtliche Einwanderungsberatung.",
      "Prüfen Sie Visabestimmungen, Mangelberufslisten und Sprachanforderungen nur bei offiziellen Quellen des jeweiligen Landes.",
      "Es wird keine Garantie für Annahme, Punkte oder Bearbeitungszeiten gegeben.",
    ],
    hi: [
      "यह एक ऑफ़लाइन व्यावसायिक-उपयुक्तता मूल्यांकन है, आव्रजन कानूनी सलाह नहीं।",
      "वीज़ा नियम, कमी सूची और भाषा आवश्यकताएँ केवल उस देश के आधिकारिक स्रोतों से जाँचें।",
      "स्वीकृति, अंक या प्रसंस्करण समय की कोई गारंटी नहीं है।",
    ],
  };
  return tables[locale] || tables.en;
}

function buildTitle(locale: CareerRiskLocale, role: string): string {
  const tables: Record<CareerRiskLocale, string> = {
    en: `Migration-oriented for «${role}»`,
    fa: `مسیرهای مهاجرتی مرتبط با «${role}»`,
    ar: `مسارات موجهة نحو الهجرة لـ «${role}»`,
    es: `Rutas orientadas a la migración para «${role}»`,
    fr: `Parcours orientés migration pour «${role}»`,
    de: `Migrationsorientierte Wege für «${role}»`,
    hi: `«${role}» के लिए प्रवास-उन्मुख मार्ग`,
  };
  return tables[locale] || tables.en;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                 */
/* ------------------------------------------------------------------ */

export function runMigrationAdvisor(
  input: MigrationAdvisorInput,
): OfflineMigrationResult {
  const profile = normalizeCareerProfile(input);
  const locale = profile.locale;

  // Score all countries
  const scored: Scored[] = COUNTRY_PROFILES.map((c) =>
    scoreCountry(c, profile),
  );

  // Deterministic ranking: score desc, then name asc.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.profile.name.localeCompare(b.profile.name);
  });

  // Take top 4
  const top = scored.slice(0, 4);

  const countries: MigrationCountry[] = top.map((s) => ({
    country: s.profile.name,
    demand: demandLine(locale, s.profile, profile),
    pathway: pathwayLine(locale, s.profile),
    notes: notesLine(locale, s.profile, profile),
  }));

  const summary = buildSummary(
    locale,
    profile,
    top.map((s) => s.profile.name),
  );

  return {
    title: buildTitle(locale, profile.currentRole),
    summary,
    countries,
    caveats: buildCaveats(locale),
    source: "heuristic",
  };
}
