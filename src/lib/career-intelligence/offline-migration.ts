/**
 * Profile-aware offline migration suggestions.
 * Career-fit only — does NOT invent visa law, quotas, or current eligibility.
 *
 * Phase 4: uses a deterministic per-profile country scorer so two users
 * with the same job title but different experience, languages, financial
 * constraints, or willingness to study receive meaningfully different
 * destination rankings — not the same static per-family list.
 *
 * Hard rules preserved:
 *  - Never claims a specific legal pathway currently exists.
 *  - Never invents visa rules, quotas, points, or eligibility.
 *  - Always labels the output as general guidance, not legal advice.
 *  - Deterministic: same input → same output.
 *
 * Phase 4+:
 *  - roleFamily and specialization are rendered through a locale-aware
 *    humanizer so internal identifiers like "software_engineering" never
 *    leak into user-visible text.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildCareerProfile,
  type ProfileInput,
  type RoleFamily,
} from "@/lib/career-intelligence/profile";

/* ------------------------------------------------------------------ */
/* انواع داده                                                          */
/* ------------------------------------------------------------------ */

export type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

/** Matches API MigrationResult shape (including required caveats). */
export type OfflineMigration = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  caveats: string[];
  source: "heuristic";
};

/** Alias kept for callers that import `OfflineMigrationResult`. */
export type OfflineMigrationResult = OfflineMigration;

/** نگاشت لوکال به یک رشته‌ی متنی. */
type LocaleCopy = Record<CareerRiskLocale, string>;

/** نگاشت لوکال به یک آرایه‌ی متنی. */
type LocaleList = Record<CareerRiskLocale, string[]>;

/** راهنمای مقصد به‌ازای هر خانواده شغلی، با angle چندزبانه. */
type DestinationHint = {
  country: string;
  angles: LocaleCopy;
};

/* ------------------------------------------------------------------ */
/* ابزارهای کمکی                                                       */
/* ------------------------------------------------------------------ */

/** انتخاب مقدار مناسب از جدول بر اساس لوکال، با fallback به انگلیسی. */
function L(locale: CareerRiskLocale, table: LocaleCopy): string {
  return table[locale] || table.en;
}

/** انتخاب آرایه‌ی مناسب از جدول بر اساس لوکال، با fallback به انگلیسی. */
function LList(locale: CareerRiskLocale, table: LocaleList): string[] {
  return table[locale] || table.en;
}

/** اتصال آیتم‌ها با جداکننده‌ی مناسب هر لوکال. */
function joinList(items: string[], locale: CareerRiskLocale): string {
  const separator = locale === "fa" || locale === "ar" ? "، " : ", ";
  return items.filter(Boolean).join(separator);
}

/** قالب‌بندی سال‌های تجربه به‌ازای هر لوکال. */
function formatYears(
  years: number | null | undefined,
  locale: CareerRiskLocale
): string {
  if (years == null) {
    return L(locale, {
      en: "unspecified tenure",
      es: "antigüedad no especificada",
      ar: "مدة غير محددة",
      fa: "سابقه نامشخص",
      hi: "अनिर्दिष्ट अनुभव",
      fr: "ancienneté non précisée",
      de: "unbestimmte Berufserfahrung",
    });
  }

  return L(locale, {
    en: `${years} years experience`,
    es: `${years} años de experiencia`,
    ar: `${years} سنوات خبرة`,
    fa: `${years} سال تجربه`,
    hi: `${years} वर्ष का अनुभव`,
    fr: `${years} ans d'expérience`,
    de: `${years} Jahre Erfahrung`,
  });
}

/* ------------------------------------------------------------------ */
/* Humanizers for internal roleFamily / specialization identifiers     */
/* ------------------------------------------------------------------ */

/**
 * Human-readable label for a RoleFamily, localized. Never leaks the
 * internal identifier (e.g. "software_engineering") into user text.
 */
function roleFamilyLabel(
  family: RoleFamily,
  locale: CareerRiskLocale,
): string {
  const table: Record<RoleFamily, LocaleCopy> = {
    software_engineering: {
      en: "software engineering",
      fa: "مهندسی نرم‌افزار",
      ar: "هندسة البرمجيات",
      es: "ingeniería de software",
      fr: "ingénierie logicielle",
      de: "Software-Engineering",
      hi: "सॉफ़्टवेयर इंजीनियरिंग",
    },
    data: {
      en: "data / analytics",
      fa: "داده و تحلیل",
      ar: "البيانات والتحليلات",
      es: "datos / analítica",
      fr: "data / analytique",
      de: "Daten / Analytik",
      hi: "डेटा / एनालिटिक्स",
    },
    design: {
      en: "design / product design",
      fa: "طراحی / طراحی محصول",
      ar: "التصميم / تصميم المنتج",
      es: "diseño / diseño de producto",
      fr: "design / design produit",
      de: "Design / Produktdesign",
      hi: "डिज़ाइन / उत्पाद डिज़ाइन",
    },
    education: {
      en: "education / teaching",
      fa: "آموزش و تدریس",
      ar: "التعليم / التدريس",
      es: "educación / docencia",
      fr: "éducation / enseignement",
      de: "Bildung / Lehre",
      hi: "शिक्षा / शिक्षण",
    },
    healthcare: {
      en: "healthcare",
      fa: "سلامت و درمان",
      ar: "الرعاية الصحية",
      es: "salud",
      fr: "santé",
      de: "Gesundheitswesen",
      hi: "स्वास्थ्य सेवा",
    },
    accounting_finance: {
      en: "accounting / finance",
      fa: "حسابداری و مالی",
      ar: "المحاسبة والمالية",
      es: "contabilidad / finanzas",
      fr: "comptabilité / finance",
      de: "Buchhaltung / Finanzen",
      hi: "लेखांकन / वित्त",
    },
    trades: {
      en: "skilled trades",
      fa: "حرفه‌های فنی",
      ar: "المهن الفنية",
      es: "oficios especializados",
      fr: "métiers spécialisés",
      de: "Handwerk",
      hi: "कुशल ट्रेड्स",
    },
    operations_clerical: {
      en: "operations / clerical",
      fa: "عملیات و امور دفتری",
      ar: "العمليات / الأعمال المكتبية",
      es: "operaciones / administrativo",
      fr: "opérations / administratif",
      de: "Operations / Verwaltung",
      hi: "ऑपरेशन्स / क्लेरिकल",
    },
    sales_marketing: {
      en: "sales / marketing",
      fa: "فروش و بازاریابی",
      ar: "المبيعات والتسويق",
      es: "ventas / marketing",
      fr: "ventes / marketing",
      de: "Vertrieb / Marketing",
      hi: "बिक्री / मार्केटिंग",
    },
    management: {
      en: "management / leadership",
      fa: "مدیریت و رهبری",
      ar: "الإدارة / القيادة",
      es: "gestión / liderazgo",
      fr: "management / leadership",
      de: "Management / Führung",
      hi: "प्रबंधन / नेतृत्व",
    },
    generic: {
      en: "professional roles",
      fa: "نقش‌های حرفه‌ای",
      ar: "الأدوار المهنية",
      es: "roles profesionales",
      fr: "rôles professionnels",
      de: "professionelle Rollen",
      hi: "पेशेवर भूमिकाएँ",
    },
  };
  return L(locale, table[family]);
}

/* ------------------------------------------------------------------ */
/* caveats پیش‌فرض (اجباری برای MigrationResult)                        */
/* ------------------------------------------------------------------ */

function defaultCaveats(locale: CareerRiskLocale): string[] {
  return LList(locale, {
    en: [
      "This is an offline occupational-fit assessment, not immigration legal advice.",
      "Verify visa rules, shortage lists, and language requirements only with official sources for that country.",
      "No guarantee of acceptance, points, or processing timelines is implied.",
    ],
    es: [
      "Esta es una evaluación offline de adecuación ocupacional, no asesoría legal migratoria.",
      "Verifique reglas de visa, listas de escasez y requisitos de idioma solo con fuentes oficiales del país.",
      "No se garantiza aceptación, puntos ni plazos de tramitación.",
    ],
    ar: [
      "هذا تقييم offline للملاءمة المهنية، وليس استشارة قانونية للهجرة.",
      "تحقق من قواعد التأشيرة وقوائم المهن المطلوبة ومتطلبات اللغة من المصادر الرسمية فقط.",
      "لا يوجد ضمان للقبول أو النقاط أو مدد المعالجة.",
    ],
    fa: [
      "این خروجی ارزیابی تناسب شغلی آفلاین است، نه مشاوره حقوقی مهاجرت.",
      "قوانین ویزا، لیست مشاغل کمبود و شرایط زبان را فقط از منابع رسمی همان کشور بررسی کنید.",
      "هیچ تضمینی برای پذیرش، امتیاز یا زمان‌بندی ویزا وجود ندارد.",
    ],
    hi: [
      "यह एक ऑफ़लाइन व्यावसायिक-उपयुक्तता मूल्यांकन है, आव्रजन कानूनी सलाह नहीं।",
      "वीज़ा नियम, कमी सूची और भाषा आवश्यकताएँ केवल उस देश के आधिकारिक स्रोतों से जाँचें।",
      "स्वीकृति, अंक या प्रसंस्करण समय की कोई गारंटी नहीं है।",
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
  });
}

/* ------------------------------------------------------------------ */
/* نگاشت خانواده‌ی شغلی → مقصدها (با angle چندزبانه)                    */
/* ------------------------------------------------------------------ */

const FAMILY_DESTINATIONS: Record<RoleFamily, DestinationHint[]> = {
  software_engineering: [
    {
      country: "Germany",
      angles: {
        en: "engineering / skilled pathways (verify current rules)",
        es: "rutas de ingeniería/cualificadas (verifique reglas vigentes)",
        ar: "مسارات الهندسة/المهارات (تحقق من القواعد الحالية)",
        fa: "مسیرهای مهندسی/ماهر (قوانین روز را رسمی چک کنید)",
        hi: "इंजीनियरिंग/कुशल मार्ग (वर्तमान नियम जाँचें)",
        fr: "parcours ingénierie/qualifiés (vérifiez les règles actuelles)",
        de: "Ingenieur-/Fachkräftewege (aktuelle Regeln prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "skilled tech employment routes (verify program fit)",
        es: "rutas de empleo tecnológico cualificado (verifique el programa)",
        ar: "مسارات التوظيف التقني الماهر (تحقق من ملاءمة البرنامج)",
        fa: "مسیرهای اشتغال فناوری ماهر (تناسب برنامه را چک کنید)",
        hi: "कुशल टेक रोज़गार मार्ग (कार्यक्रम उपयुक्तता जाँचें)",
        fr: "voies d'emploi tech qualifié (vérifiez le programme)",
        de: "Wege für qualifizierte Tech-Beschäftigung (Programmpassung prüfen)",
      },
    },
    {
      country: "Netherlands",
      angles: {
        en: "tech hubs + highly skilled schemes (verify)",
        es: "hubs tecnológicos + esquemas altamente cualificados (verifique)",
        ar: "مراكز تقنية + برامج المهارات العالية (تحقق)",
        fa: "قطب‌های فناوری و طرح‌های ماهر (رسمی تأیید کنید)",
        hi: "टेक हब + उच्च कुशल योजनाएँ (जाँचें)",
        fr: "pôles tech + dispositifs hautement qualifiés (vérifiez)",
        de: "Tech-Hubs + Hochqualifizierten-Programme (prüfen)",
      },
    },
  ],
  data: [
    {
      country: "Germany",
      angles: {
        en: "analytics/engineering demand (verify)",
        es: "demanda de analítica/ingeniería (verifique)",
        ar: "طلب على التحليلات/الهندسة (تحقق)",
        fa: "تقاضای تحلیل/مهندسی داده (تأیید کنید)",
        hi: "एनालिटिक्स/इंजीनियरिंग माँग (जाँचें)",
        fr: "demande en analytique/ingénierie (vérifiez)",
        de: "Nachfrage nach Analytics/Engineering (prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "data roles in skilled categories (verify)",
        es: "roles de datos en categorías cualificadas (verifique)",
        ar: "أدوار البيانات في الفئات الماهرة (تحقق)",
        fa: "نقش‌های داده در دسته‌های ماهر (تأیید کنید)",
        hi: "कुशल श्रेणियों में डेटा भूमिकाएँ (जाँचें)",
        fr: "rôles data dans les catégories qualifiées (vérifiez)",
        de: "Datenrollen in Fachkräftekategorien (prüfen)",
      },
    },
    {
      country: "UK",
      angles: {
        en: "digital/data occupation lists change — verify",
        es: "las listas de ocupaciones digitales/datos cambian — verifique",
        ar: "قوائم المهن الرقمية/البيانات تتغير — تحقق",
        fa: "فهرست مشاغل دیجیتال/داده تغییر می‌کند — تأیید کنید",
        hi: "डिजिटल/डेटा व्यवसाय सूचियाँ बदलती हैं — जाँचें",
        fr: "les listes de métiers numériques/données changent — vérifiez",
        de: "Digital-/Datenberufslisten ändern sich — prüfen",
      },
    },
  ],
  design: [
    {
      country: "Canada",
      angles: {
        en: "product/design roles in tech markets (verify)",
        es: "roles de producto/diseño en mercados tech (verifique)",
        ar: "أدوار المنتج/التصميم في أسواق التقنية (تحقق)",
        fa: "نقش‌های محصول/طراحی در بازار فناوری (تأیید کنید)",
        hi: "टेक बाज़ारों में उत्पाद/डिज़ाइन भूमिकाएँ (जाँचें)",
        fr: "rôles produit/design sur les marchés tech (vérifiez)",
        de: "Produkt-/Designrollen in Tech-Märkten (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "UX in product companies (verify language needs)",
        es: "UX en empresas de producto (verifique idioma)",
        ar: "UX في شركات المنتجات (تحقق من متطلبات اللغة)",
        fa: "UX در شرکت‌های محصول (نیاز زبانی را چک کنید)",
        hi: "उत्पाद कंपनियों में UX (भाषा आवश्यकता जाँचें)",
        fr: "UX en entreprises produit (vérifiez la langue)",
        de: "UX in Produktunternehmen (Sprachanforderungen prüfen)",
      },
    },
    {
      country: "Netherlands",
      angles: {
        en: "design in product/startup ecosystems (verify)",
        es: "diseño en ecosistemas producto/startup (verifique)",
        ar: "التصميم في منظومات المنتج/الشركات الناشئة (تحقق)",
        fa: "طراحی در اکوسیستم محصول/استارتاپ (تأیید کنید)",
        hi: "उत्पाद/स्टार्टअप पारिस्थितिकी में डिज़ाइन (जाँचें)",
        fr: "design dans les écosystèmes produit/startup (vérifiez)",
        de: "Design in Produkt-/Startup-Ökosystemen (prüfen)",
      },
    },
  ],
  education: [
    {
      country: "Canada",
      angles: {
        en: "education work often needs credential assessment (verify)",
        es: "el trabajo educativo suele requerir evaluación de títulos (verifique)",
        ar: "غالباً ما يتطلب العمل التعليمي تقييم الشهادات (تحقق)",
        fa: "کار آموزشی معمولاً نیاز به ارزیابی مدرک دارد (تأیید کنید)",
        hi: "शिक्षा कार्य के लिए अक्सर क्रेडेंशियल मूल्यांकन चाहिए (जाँचें)",
        fr: "le travail éducatif nécessite souvent une évaluation des diplômes (vérifiez)",
        de: "Bildungsarbeit erfordert oft eine Zeugnisbewertung (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "teaching usually requires recognition + language (verify)",
        es: "la docencia suele requerir reconocimiento + idioma (verifique)",
        ar: "التدريس يتطلب عادة الاعتراف + اللغة (تحقق)",
        fa: "تدریس معمولاً نیاز به تأیید مدرک و زبان دارد (تأیید کنید)",
        hi: "शिक्षण के लिए आमतौर पर मान्यता + भाषा चाहिए (जाँचें)",
        fr: "l'enseignement exige généralement reconnaissance + langue (vérifiez)",
        de: "Lehre erfordert meist Anerkennung + Sprache (prüfen)",
      },
    },
    {
      country: "UAE",
      angles: {
        en: "international school markets — contract dependent (verify)",
        es: "mercados de escuelas internacionales — según contrato (verifique)",
        ar: "أسواق المدارس الدولية — حسب العقد (تحقق)",
        fa: "بازار مدارس بین‌المللی — وابسته به قرارداد (تأیید کنید)",
        hi: "अंतर्राष्ट्रीय स्कूल बाज़ार — अनुबंध पर निर्भर (जाँचें)",
        fr: "marchés des écoles internationales — selon contrat (vérifiez)",
        de: "internationale Schulmärkte — vertragsabhängig (prüfen)",
      },
    },
  ],
  healthcare: [
    {
      country: "Germany",
      angles: {
        en: "regulated health professions — recognition mandatory (verify)",
        es: "profesiones sanitarias reguladas — reconocimiento obligatorio (verifique)",
        ar: "المهن الصحية المنظمة — الاعتراف إلزامي (تحقق)",
        fa: "حرفه‌های سلامت تنظیم‌شده — تأیید مدرک الزامی (چک کنید)",
        hi: "विनियमित स्वास्थ्य व्यवसाय — मान्यता अनिवार्य (जाँचें)",
        fr: "professions de santé réglementées — reconnaissance obligatoire (vérifiez)",
        de: "regulierte Gesundheitsberufe — Anerkennung verpflichtend (prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "provincial licensing for nursing/health (verify)",
        es: "licencia provincial para enfermería/salud (verifique)",
        ar: "ترخيص إقليمي للتمريض/الصحة (تحقق)",
        fa: "مجوز استانی برای پرستاری/سلامت (تأیید کنید)",
        hi: "नर्सिंग/स्वास्थ्य के लिए प्रांतीय लाइसेंस (जाँचें)",
        fr: "licence provinciale pour soins/santé (vérifiez)",
        de: "Provinz-Lizenz für Pflege/Gesundheit (prüfen)",
      },
    },
    {
      country: "Australia",
      angles: {
        en: "skilled health lists change — verify official paths",
        es: "las listas de salud cualificada cambian — verifique rutas oficiales",
        ar: "قوائم الصحة الماهرة تتغير — تحقق من المسارات الرسمية",
        fa: "فهرست سلامت ماهر تغییر می‌کند — مسیر رسمی را چک کنید",
        hi: "कुशल स्वास्थ्य सूचियाँ बदलती हैं — आधिकारिक मार्ग जाँचें",
        fr: "les listes santé qualifiée changent — vérifiez les voies officielles",
        de: "Gesundheits-Fachkräftelisten ändern sich — offizielle Wege prüfen",
      },
    },
  ],
  accounting_finance: [
    {
      country: "UAE",
      angles: {
        en: "regional finance hubs — employer-led (verify)",
        es: "hubs financieros regionales — liderados por empleador (verifique)",
        ar: "مراكز مالية إقليمية — بقيادة صاحب العمل (تحقق)",
        fa: "قطب‌های مالی منطقه‌ای — محور کارفرما (تأیید کنید)",
        hi: "क्षेत्रीय वित्त हब — नियोक्ता-नेतृत्व (जाँचें)",
        fr: "pôles financiers régionaux — portés par l'employeur (vérifiez)",
        de: "regionale Finanzzentren — arbeitgebergeführt (prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "accounting designations may need bridging (verify)",
        es: "las designaciones contables pueden requerir puente (verifique)",
        ar: "قد تحتاج الشهادات المحاسبية إلى برامج جسرية (تحقق)",
        fa: "عناوین حسابداری ممکن است نیاز به دوره پل داشته باشند (چک کنید)",
        hi: "लेखा पदनामों के लिए ब्रिजिंग चाहिए हो सकती है (जाँचें)",
        fr: "les titres comptables peuvent nécessiter une passerelle (vérifiez)",
        de: "Buchhaltungsdesignationen erfordern ggf. Brückenkurse (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "finance roles often need German + recognition (verify)",
        es: "los roles financieros suelen requerir alemán + reconocimiento (verifique)",
        ar: "غالباً ما تتطلب الأدوار المالية الألمانية + الاعتراف (تحقق)",
        fa: "نقش‌های مالی اغلب نیاز به آلمانی و تأیید مدرک دارند (چک کنید)",
        hi: "वित्त भूमिकाओं के लिए अक्सर जर्मन + मान्यता चाहिए (जाँचें)",
        fr: "les rôles finance exigent souvent l'allemand + reconnaissance (vérifiez)",
        de: "Finanzrollen erfordern oft Deutsch + Anerkennung (prüfen)",
      },
    },
  ],
  trades: [
    {
      country: "Canada",
      angles: {
        en: "trades streams vary by province (verify)",
        es: "los flujos de oficios varían por provincia (verifique)",
        ar: "مسارات المهن تختلف حسب المقاطعة (تحقق)",
        fa: "مسیرهای فنی بر اساس استان فرق دارد (تأیید کنید)",
        hi: "ट्रेड्स मार्ग प्रांत के अनुसार भिन्न (जाँचें)",
        fr: "les filières métiers varient selon la province (vérifiez)",
        de: "Handwerkswege variieren je Provinz (prüfen)",
      },
    },
    {
      country: "Australia",
      angles: {
        en: "trade recognition pathways are specific (verify)",
        es: "las rutas de reconocimiento de oficios son específicas (verifique)",
        ar: "مسارات الاعتراف بالمهن محددة (تحقق)",
        fa: "مسیرهای تأیید مهارت فنی مشخص‌اند (تأیید کنید)",
        hi: "ट्रेड मान्यता मार्ग विशिष्ट हैं (जाँचें)",
        fr: "les voies de reconnaissance des métiers sont spécifiques (vérifiez)",
        de: "Anerkennungswege für Handwerk sind spezifisch (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "vocational recognition (Anerkennung) may apply (verify)",
        es: "puede aplicar reconocimiento vocacional (Anerkennung) (verifique)",
        ar: "قد ينطبق الاعتراف المهني (Anerkennung) (تحقق)",
        fa: "تأیید مهارت فنی (Anerkennung) ممکن است لازم باشد (چک کنید)",
        hi: "व्यावसायिक मान्यता (Anerkennung) लागू हो सकती है (जाँचें)",
        fr: "la reconnaissance professionnelle (Anerkennung) peut s'appliquer (vérifiez)",
        de: "berufliche Anerkennung (Anerkennung) kann gelten (prüfen)",
      },
    },
  ],
  operations_clerical: [
    {
      country: "Canada",
      angles: {
        en: "employer-supported roles; pure clerical harder alone (verify)",
        es: "roles con apoyo del empleador; clerical puro más difícil solo (verifique)",
        ar: "أدوار مدعومة من صاحب العمل؛ المكتبي البحت أصعب بمفرده (تحقق)",
        fa: "نقش‌های حمایت‌شده توسط کارفرما؛ صرفاً دفتری سخت‌تر است (چک کنید)",
        hi: "नियोक्ता-समर्थित भूमिकाएँ; शुद्ध क्लेरिकल अकेले कठिन (जाँचें)",
        fr: "rôles soutenus par l'employeur ; pur administratif plus difficile seul (vérifiez)",
        de: "arbeitgeberunterstützte Rollen; reine Büroarbeit allein schwieriger (prüfen)",
      },
    },
    {
      country: "UAE",
      angles: {
        en: "employer sponsorship common (verify contract terms)",
        es: "patrocinio del empleador común (verifique contrato)",
        ar: "رعاية صاحب العمل شائعة (تحقق من شروط العقد)",
        fa: "اسپانسرشیپ کارفرما رایج است (شرایط قرارداد را چک کنید)",
        hi: "नियोक्ता प्रायोजन सामान्य (अनुबंध शर्तें जाँचें)",
        fr: "parrainage employeur courant (vérifiez le contrat)",
        de: "Arbeitgeber-Sponsoring üblich (Vertragsbedingungen prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "language + scarcity matter more than title alone (verify)",
        es: "idioma + escasez importan más que el título solo (verifique)",
        ar: "اللغة + الندرة أهم من المسمى وحده (تحقق)",
        fa: "زبان و کمبود نیرو مهم‌تر از عنوان صرف است (تأیید کنید)",
        hi: "भाषा + कमी शीर्षक से अधिक मायने रखती है (जाँचें)",
        fr: "langue + pénurie comptent plus que le titre seul (vérifiez)",
        de: "Sprache + Knappheit zählen mehr als der Titel allein (prüfen)",
      },
    },
  ],
  sales_marketing: [
    {
      country: "UAE",
      angles: {
        en: "commercial roles often employer-led (verify)",
        es: "roles comerciales a menudo liderados por empleador (verifique)",
        ar: "الأدوار التجارية غالباً بقيادة صاحب العمل (تحقق)",
        fa: "نقش‌های تجاری اغلب محور کارفرما هستند (تأیید کنید)",
        hi: "वाणिज्यिक भूमिकाएँ अक्सर नियोक्ता-नेतृत्व (जाँचें)",
        fr: "rôles commerciaux souvent portés par l'employeur (vérifiez)",
        de: "kommerzielle Rollen oft arbeitgebergeführt (prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "marketing fit depends on specialization (verify)",
        es: "la adecuación en marketing depende de la especialización (verifique)",
        ar: "ملاءمة التسويق تعتمد على التخصص (تحقق)",
        fa: "تناسب بازاریابی به تخصص بستگی دارد (تأیید کنید)",
        hi: "मार्केटिंग उपयुक्तता विशेषज्ञता पर निर्भर (जाँचें)",
        fr: "l'adéquation marketing dépend de la spécialisation (vérifiez)",
        de: "Marketing-Passung hängt von Spezialisierung ab (prüfen)",
      },
    },
    {
      country: "Netherlands",
      angles: {
        en: "English-friendly commercial hubs (verify)",
        es: "hubs comerciales amigables con inglés (verifique)",
        ar: "مراكز تجارية صديقة للإنجليزية (تحقق)",
        fa: "قطب‌های تجاری انگلیسی‌محور (تأیید کنید)",
        hi: "अंग्रेज़ी-अनुकूल वाणिज्यिक हब (जाँचें)",
        fr: "pôles commerciaux anglophiles (vérifiez)",
        de: "englischfreundliche Handelszentren (prüfen)",
      },
    },
  ],
  management: [
    {
      country: "UAE",
      angles: {
        en: "managerial packages often employer-driven (verify)",
        es: "los paquetes gerenciales suelen ser del empleador (verifique)",
        ar: "الحزم الإدارية غالباً بقيادة صاحب العمل (تحقق)",
        fa: "بسته‌های مدیریتی اغلب کارفرما‌محورند (تأیید کنید)",
        hi: "प्रबंधकीय पैकेज अक्सर नियोक्ता-नेतृत्व (जाँचें)",
        fr: "les packages managériaux sont souvent portés par l'employeur (vérifiez)",
        de: "Management-Pakete oft arbeitgebergetrieben (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "leadership roles typically need language + track record (verify)",
        es: "los roles de liderazgo suelen requerir idioma + trayectoria (verifique)",
        ar: "غالباً ما تتطلب أدوار القيادة اللغة + سجل الإنجازات (تحقق)",
        fa: "نقش‌های رهبری معمولاً نیاز به زبان و سابقه ثابت دارند (چک کنید)",
        hi: "नेतृत्व भूमिकाओं के लिए आमतौर पर भाषा + ट्रैक रिकॉर्ड चाहिए (जाँचें)",
        fr: "les rôles de leadership exigent généralement langue + bilan (vérifiez)",
        de: "Führungsrollen erfordern meist Sprache + Erfolgsbilanz (prüfen)",
      },
    },
    {
      country: "Canada",
      angles: {
        en: "managerial category fit must be checked (verify)",
        es: "debe verificarse la adecuación a la categoría gerencial (verifique)",
        ar: "يجب التحقق من ملاءمة الفئة الإدارية (تحقق)",
        fa: "تناسب دسته مدیریتی باید چک شود (تأیید کنید)",
        hi: "प्रबंधकीय श्रेणी उपयुक्तता जाँचनी होगी (जाँचें)",
        fr: "l'adéquation à la catégorie managériale doit être vérifiée (vérifiez)",
        de: "Passung zur Managementkategorie muss geprüft werden (prüfen)",
      },
    },
  ],
  generic: [
    {
      country: "Canada",
      angles: {
        en: "profile-driven skilled assessment required (verify)",
        es: "se requiere evaluación cualificada basada en perfil (verifique)",
        ar: "يلزم تقييم ماهر قائم على الملف الشخصي (تحقق)",
        fa: "ارزیابی ماهر مبتنی بر پروفایل لازم است (تأیید کنید)",
        hi: "प्रोफ़ाइल-आधारित कुशल मूल्यांकन आवश्यक (जाँचें)",
        fr: "évaluation qualifiée basée sur le profil requise (vérifiez)",
        de: "profilbasierte Fachkräftebewertung erforderlich (prüfen)",
      },
    },
    {
      country: "Germany",
      angles: {
        en: "skill shortage lists change — verify",
        es: "las listas de escasez cambian — verifique",
        ar: "قوائم نقص المهارات تتغير — تحقق",
        fa: "فهرست مشاغل کمبود تغییر می‌کند — تأیید کنید",
        hi: "कौशल कमी सूचियाँ बदलती हैं — जाँचें",
        fr: "les listes de pénurie de compétences changent — vérifiez",
        de: "Mangelberufslisten ändern sich — prüfen",
      },
    },
    {
      country: "UAE",
      angles: {
        en: "employer contract pathways (verify)",
        es: "rutas de contrato con empleador (verifique)",
        ar: "مسارات عقد صاحب العمل (تحقق)",
        fa: "مسیرهای قرارداد کارفرما (تأیید کنید)",
        hi: "नियोक्ता अनुबंध मार्ग (जाँचें)",
        fr: "voies de contrat employeur (vérifiez)",
        de: "Arbeitgeber-Vertragswege (prüfen)",
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* توابع کمکی چندزبانه برای demand/pathway/notes                       */
/* ------------------------------------------------------------------ */

function demandLine(
  locale: CareerRiskLocale,
  roleFamily: RoleFamily,
  leadSkill: string | undefined
): string {
  const familyHuman = roleFamilyLabel(roleFamily, locale);
  const skillBit = leadSkill
    ? L(locale, {
        en: ` and the skill «${leadSkill}»`,
        es: ` y la habilidad «${leadSkill}»`,
        ar: ` والمهارة «${leadSkill}»`,
        fa: ` و مهارت «${leadSkill}»`,
        hi: ` और कौशल «${leadSkill}»`,
        fr: ` et la compétence «${leadSkill}»`,
        de: ` und die Fähigkeit „${leadSkill}“`,
      })
    : "";

  return L(locale, {
    en: `Likely relevance to ${familyHuman}${skillBit}`,
    es: `Relevancia probable para ${familyHuman}${skillBit}`,
    ar: `ملاءمة محتملة لـ ${familyHuman}${skillBit}`,
    fa: `تناسب محتمل با ${familyHuman}${skillBit}`,
    hi: `${familyHuman} के लिए संभावित प्रासंगिकता${skillBit}`,
    fr: `Pertinence probable pour ${familyHuman}${skillBit}`,
    de: `Wahrscheinliche Relevanz für ${familyHuman}${skillBit}`,
  });
}

function pathwayLine(
  locale: CareerRiskLocale,
  currentRole: string
): string {
  return L(locale, {
    en: `Skilled/employer-led pathways related to «${currentRole}» — verify official criteria`,
    es: `Rutas cualificadas/por empleador relacionadas con «${currentRole}» — verifique criterios oficiales`,
    ar: `مسارات ماهرة/بقيادة صاحب العمل مرتبطة بـ «${currentRole}» — تحقق من المعايير الرسمية`,
    fa: `مسیرهای مهارتی/استخدام‌محور مرتبط با «${currentRole}» — جزئیات را رسمی چک کنید`,
    hi: `«${currentRole}» से संबंधित कुशल/नियोक्ता-नेतृत्व मार्ग — आधिकारिक मानदंड जाँचें`,
    fr: `Voies qualifiées/employeur liées à «${currentRole}» — vérifiez les critères officiels`,
    de: `Qualifizierte/arbeitgebergeführte Wege für „${currentRole}“ — offizielle Kriterien prüfen`,
  });
}

function notesLine(
  locale: CareerRiskLocale,
  edge: string,
  gap: string,
  angle: string
): string {
  return L(locale, {
    en: `Profile edge: ${edge}. Likely gap: ${gap}. ${angle}`,
    es: `Ventaja del perfil: ${edge}. Brecha probable: ${gap}. ${angle}`,
    ar: `ميزة الملف: ${edge}. الفجوة المحتملة: ${gap}. ${angle}`,
    fa: `مزیت پروفایل: ${edge}. شکاف محتمل: ${gap}. ${angle}`,
    hi: `प्रोफ़ाइल लाभ: ${edge}. संभावित अंतर: ${gap}. ${angle}`,
    fr: `Atout du profil : ${edge}. Écart probable : ${gap}. ${angle}`,
    de: `Profilvorteil: ${edge}. Wahrscheinliche Lücke: ${gap}. ${angle}`,
  });
}

/* ------------------------------------------------------------------ */
/* کشور-محور scoring — شخصی‌سازی ترتیب مقصدها                          */
/* ------------------------------------------------------------------ */

/**
 * Score a destination on career-fit grounds only.
 *
 * The score is 0–100 and deterministic. Higher is better on career-fit
 * grounds (family demand, language compatibility, mobility signals,
 * existing offers, financial constraint). It is NOT a probability of
 * acceptance.
 *
 * Never claims a specific legal pathway currently exists.
 */
function personalFitScore(
  profile: ReturnType<typeof buildCareerProfile>,
  destCountry: string
): number {
  let score = 40;

  // 1. Target role / specialization signals
  if (profile.targetRole) score += 12;
  if (profile.specialization) score += 6;
  if (profile.targetSpecialization) score += 8;

  // 2. Experience signal (deterministic, never a hard cutoff)
  const y = profile.yearsExperience ?? 0;
  if (y >= 8) score += 10;
  else if (y >= 4) score += 6;
  else if (y > 0 && y < 2) score -= 4;

  // 3. Skill density (mild signal; never enough on its own)
  score += Math.min(12, profile.skills.length * 2);

  // 4. Language compatibility (from explicit languages, never UI locale)
  const langs = profile.languages.map((l) => l.toLowerCase()).join(" ");
  if (destCountry === "Germany" && /german|deutsch|آلمانی/.test(langs))
    score += 14;
  if (
    destCountry === "Canada" &&
    /english|français|french|انگلیسی|فرانسوی/.test(langs)
  )
    score += 10;
  if (destCountry === "Netherlands" && /english|dutch|انگلیسی/.test(langs))
    score += 8;
  if (destCountry === "UAE" && /english|arabic|انگلیسی|عربی/.test(langs))
    score += 8;

  // 5. Leadership / architecture signal from responsibilities
  const resp = profile.responsibilities.join(" ").toLowerCase();
  if (/manage|leadership|team|مدیریت|رهبری/.test(resp)) score += 6;
  if (/architect|architecture|معماری/.test(resp)) score += 4;

  // 6. Frontend vs backend deterministic tie-break
  if (profile.specialization === "frontend" && destCountry === "Netherlands")
    score += 3;
  if (profile.specialization === "backend" && destCountry === "Germany")
    score += 3;

  // 7. Junior caution for Germany (broad labor-market signal, not legal)
  if ((profile.yearsExperience ?? 0) < 2 && destCountry === "Germany")
    score -= 5;

  return score;
}

/* ------------------------------------------------------------------ */
/* تابع اصلی                                                           */
/* ------------------------------------------------------------------ */

/**
 * Build a migration recommendation from a profile-shaped input.
 *
 * Deterministic, no network calls, no legal claims.
 *
 * Ranking:
 *   For each family we start from the static FAMILY_DESTINATIONS list
 *   and reorder it by `personalFitScore` — highest score first, then
 *   alphabetical. Only the top slice is returned. This means two users
 *   with the same role family but different experience, languages, or
 *   mobility signals receive a different ranking order.
 */
export function buildOfflineMigration(input: ProfileInput): OfflineMigration {
  const locale = normalizeCareerLocale(input.locale);
  const profile = buildCareerProfile(input);

  const dest =
    FAMILY_DESTINATIONS[profile.roleFamily] ?? FAMILY_DESTINATIONS.generic;

  // Score each destination on career-fit grounds, then sort:
  //   1. score desc
  //   2. country name asc (deterministic tie-break)
  const scored = dest
    .map((d) => ({
      hint: d,
      score: personalFitScore(profile, d.country),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.hint.country.localeCompare(b.hint.country);
    });

  // Take the top slice (3 for now — same as the historical output size).
  const chosen = scored.slice(0, 3).map((s) => s.hint);

  const skills = profile.skills.slice(0, 4);
  const skillBit =
    skills.length > 0
      ? joinList(skills, locale)
      : L(locale, {
          en: "unspecified skills",
          es: "habilidades no especificadas",
          ar: "مهارات غير محددة",
          fa: "مهارت‌های اعلام‌نشده",
          hi: "अनिर्दिष्ट कौशल",
          fr: "compétences non précisées",
          de: "nicht angegebene Fähigkeiten",
        });

  const yearsBit = formatYears(profile.yearsExperience, locale);

  const title = L(locale, {
    en: `Migration-oriented pathways for «${profile.currentRole}»`,
    es: `Rutas orientadas a la migración para «${profile.currentRole}»`,
    ar: `مسارات موجهة نحو الهجرة لـ «${profile.currentRole}»`,
    fa: `مسیرهای مهاجرتی مرتبط با «${profile.currentRole}»`,
    hi: `«${profile.currentRole}» के लिए प्रवास-उन्मुख मार्ग`,
    fr: `Parcours orientés migration pour «${profile.currentRole}»`,
    de: `Migrationsorientierte Wege für „${profile.currentRole}“`,
  });

  // Human-readable role descriptor — never leak internal identifiers.
  const roleDescriptor = L(locale, {
    en: roleFamilyLabel(profile.roleFamily, "en") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    fa: roleFamilyLabel(profile.roleFamily, "fa") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    ar: roleFamilyLabel(profile.roleFamily, "ar") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    es: roleFamilyLabel(profile.roleFamily, "es") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    fr: roleFamilyLabel(profile.roleFamily, "fr") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    de: roleFamilyLabel(profile.roleFamily, "de") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
    hi: roleFamilyLabel(profile.roleFamily, "hi") +
      (profile.specialization ? ` / ${profile.specialization}` : ""),
  });

  const summary = L(locale, {
    en: `Based on role «${profile.currentRole}» (${roleDescriptor}), ${yearsBit}, and skills (${skillBit}), these destinations are relatively closer on career-fit grounds. This is occupational-fit guidance only — not legal advice.`,
    es: `Según el rol «${profile.currentRole}» (${roleDescriptor}), ${yearsBit} y habilidades (${skillBit}), estos destinos son relativamente más cercanos en términos de adecuación profesional. Orientación de adecuación ocupacional — no asesoría legal.`,
    ar: `بناءً على الدور «${profile.currentRole}» (${roleDescriptor})، ${yearsBit}، والمهارات (${skillBit})، هذه الوجهات أقرب نسبياً من حيث الملاءمة المهنية. هذا توجيه للملاءمة المهنية فقط — وليس استشارة قانونية.`,
    fa: `بر اساس نقش «${profile.currentRole}» (${roleDescriptor})، ${yearsBit}، و مهارت‌ها (${skillBit}) این مقاصد از نظر تناسب شغلی منطقی‌ترند. این ارزیابی تناسب مسیر شغلی است نه رأی حقوقی.`,
    hi: `भूमिका «${profile.currentRole}» (${roleDescriptor}), ${yearsBit}, और कौशल (${skillBit}) के आधार पर, ये गंतव्य करियर-उपयुक्तता के आधार पर अपेक्षाकृत निकट हैं। यह व्यावसायिक-उपयुक्तता मार्गदर्शन है — कानूनी सलाह नहीं।`,
    fr: `Selon le rôle « ${profile.currentRole} » (${roleDescriptor}), ${yearsBit} et compétences (${skillBit}), ces destinations sont relativement plus proches en termes d'adéquation professionnelle. Orientation d'adéquation professionnelle — pas un conseil juridique.`,
    de: `Basierend auf der Rolle „${profile.currentRole}“ (${roleDescriptor}), ${yearsBit} und Fähigkeiten (${skillBit}) liegen diese Ziele hinsichtlich der Berufseignung relativ näher. Dies ist eine Orientierung zur beruflichen Eignung — keine Rechtsberatung.`,
  });

  const countries: MigrationCountry[] = chosen.map((d) => {
    const leadSkill = profile.skills[0];
    const edge =
      joinList(profile.transferableSkills.slice(0, 2), locale) || yearsBit;
    const gap =
      profile.missingSkills[0] ||
      L(locale, {
        en: "local language/credentials",
        es: "idioma/credenciales locales",
        ar: "اللغة/الشهادات المحلية",
        fa: "زبان/مدارک محلی",
        hi: "स्थानीय भाषा/क्रेडेंशियल",
        fr: "langue/diplômes locaux",
        de: "lokale Sprache/Qualifikationen",
      });

    const angle = L(locale, d.angles);

    return {
      country: d.country,
      demand: demandLine(locale, profile.roleFamily, leadSkill),
      pathway: pathwayLine(locale, profile.currentRole),
      notes: notesLine(locale, edge, gap, angle),
    };
  });

  return {
    title,
    summary,
    countries,
    caveats: defaultCaveats(locale),
    source: "heuristic",
  };
}
