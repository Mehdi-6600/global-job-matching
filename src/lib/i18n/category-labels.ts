import type { Locale } from "./config";

/**
 * Central map of job-category slug → localized label.
 *
 * The database stores categories with a single `name` (usually English)
 * plus a stable `slug`. The slug is the identity we translate; the raw
 * DB `name` remains the fallback for any slug we don't recognize here
 * (e.g. a category an employer created on the fly).
 *
 * Extend this map when new well-known categories are added to the site.
 */
const CATEGORY_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  engineering: {
    en: "Engineering",
    fa: "مهندسی",
    ar: "الهندسة",
    es: "Ingeniería",
    fr: "Ingénierie",
    de: "Engineering",
    hi: "इंजीनियरिंग",
  },
  "software-engineering": {
    en: "Software Engineering",
    fa: "مهندسی نرم‌افزار",
    ar: "هندسة البرمجيات",
    es: "Ingeniería de software",
    fr: "Ingénierie logicielle",
    de: "Software-Engineering",
    hi: "सॉफ़्टवेयर इंजीनियरिंग",
  },
  design: {
    en: "Design",
    fa: "طراحی",
    ar: "التصميم",
    es: "Diseño",
    fr: "Design",
    de: "Design",
    hi: "डिज़ाइन",
  },
  "ux-design": {
    en: "UX Design",
    fa: "طراحی تجربه کاربری",
    ar: "تصميم تجربة المستخدم",
    es: "Diseño UX",
    fr: "Design UX",
    de: "UX-Design",
    hi: "UX डिज़ाइन",
  },
  marketing: {
    en: "Marketing",
    fa: "بازاریابی",
    ar: "التسويق",
    es: "Marketing",
    fr: "Marketing",
    de: "Marketing",
    hi: "मार्केटिंग",
  },
  "digital-marketing": {
    en: "Digital Marketing",
    fa: "بازاریابی دیجیتال",
    ar: "التسويق الرقمي",
    es: "Marketing digital",
    fr: "Marketing digital",
    de: "Digitales Marketing",
    hi: "डिजिटल मार्केटिंग",
  },
  sales: {
    en: "Sales",
    fa: "فروش",
    ar: "المبيعات",
    es: "Ventas",
    fr: "Ventes",
    de: "Vertrieb",
    hi: "बिक्री",
  },
  finance: {
    en: "Finance",
    fa: "مالی",
    ar: "المالية",
    es: "Finanzas",
    fr: "Finance",
    de: "Finanzen",
    hi: "वित्त",
  },
  accounting: {
    en: "Accounting",
    fa: "حسابداری",
    ar: "المحاسبة",
    es: "Contabilidad",
    fr: "Comptabilité",
    de: "Buchhaltung",
    hi: "लेखांकन",
  },
  healthcare: {
    en: "Healthcare",
    fa: "سلامت و درمان",
    ar: "الرعاية الصحية",
    es: "Salud",
    fr: "Santé",
    de: "Gesundheitswesen",
    hi: "स्वास्थ्य सेवा",
  },
  education: {
    en: "Education",
    fa: "آموزش",
    ar: "التعليم",
    es: "Educación",
    fr: "Éducation",
    de: "Bildung",
    hi: "शिक्षा",
  },
  "customer-support": {
    en: "Customer Support",
    fa: "پشتیبانی مشتری",
    ar: "دعم العملاء",
    es: "Atención al cliente",
    fr: "Support client",
    de: "Kundensupport",
    hi: "ग्राहक सहायता",
  },
  operations: {
    en: "Operations",
    fa: "عملیات",
    ar: "العمليات",
    es: "Operaciones",
    fr: "Opérations",
    de: "Operations",
    hi: "ऑपरेशन्स",
  },
  "human-resources": {
    en: "Human Resources",
    fa: "منابع انسانی",
    ar: "الموارد البشرية",
    es: "Recursos Humanos",
    fr: "Ressources humaines",
    de: "Personalwesen",
    hi: "मानव संसाधन",
  },
  hr: {
    en: "HR",
    fa: "منابع انسانی",
    ar: "الموارد البشرية",
    es: "RR.HH.",
    fr: "RH",
    de: "HR",
    hi: "HR",
  },
  legal: {
    en: "Legal",
    fa: "حقوقی",
    ar: "القانون",
    es: "Legal",
    fr: "Juridique",
    de: "Recht",
    hi: "कानूनी",
  },
  "data-science": {
    en: "Data Science",
    fa: "علم داده",
    ar: "علم البيانات",
    es: "Ciencia de datos",
    fr: "Science des données",
    de: "Datenwissenschaft",
    hi: "डेटा साइंस",
  },
  "data-analytics": {
    en: "Data Analytics",
    fa: "تحلیل داده",
    ar: "تحليلات البيانات",
    es: "Analítica de datos",
    fr: "Analyse de données",
    de: "Datenanalyse",
    hi: "डेटा एनालिटिक्स",
  },
  "artificial-intelligence": {
    en: "Artificial Intelligence",
    fa: "هوش مصنوعی",
    ar: "الذكاء الاصطناعي",
    es: "Inteligencia artificial",
    fr: "Intelligence artificielle",
    de: "Künstliche Intelligenz",
    hi: "आर्टिफिशियल इंटेलिजेंस",
  },
  "machine-learning": {
    en: "Machine Learning",
    fa: "یادگیری ماشین",
    ar: "تعلم الآلة",
    es: "Aprendizaje automático",
    fr: "Apprentissage automatique",
    de: "Maschinelles Lernen",
    hi: "मशीन लर्निंग",
  },
  "product-management": {
    en: "Product Management",
    fa: "مدیریت محصول",
    ar: "إدارة المنتج",
    es: "Gestión de producto",
    fr: "Gestion produit",
    de: "Produktmanagement",
    hi: "उत्पाद प्रबंधन",
  },
  "project-management": {
    en: "Project Management",
    fa: "مدیریت پروژه",
    ar: "إدارة المشاريع",
    es: "Gestión de proyectos",
    fr: "Gestion de projet",
    de: "Projektmanagement",
    hi: "प्रोजेक्ट प्रबंधन",
  },
  "quality-assurance": {
    en: "Quality Assurance",
    fa: "تضمین کیفیت",
    ar: "ضمان الجودة",
    es: "Aseguramiento de calidad",
    fr: "Assurance qualité",
    de: "Qualitätssicherung",
    hi: "गुणवत्ता आश्वासन",
  },
  qa: {
    en: "QA",
    fa: "تضمین کیفیت",
    ar: "ضمان الجودة",
    es: "QA",
    fr: "QA",
    de: "QA",
    hi: "QA",
  },
  "devops": {
    en: "DevOps",
    fa: "دواپس",
    ar: "ديف أوبس",
    es: "DevOps",
    fr: "DevOps",
    de: "DevOps",
    hi: "DevOps",
  },
  "it-support": {
    en: "IT Support",
    fa: "پشتیبانی فناوری اطلاعات",
    ar: "دعم تقنية المعلومات",
    es: "Soporte técnico",
    fr: "Support informatique",
    de: "IT-Support",
    hi: "IT सहायता",
  },
  writing: {
    en: "Writing",
    fa: "نویسندگی",
    ar: "الكتابة",
    es: "Redacción",
    fr: "Rédaction",
    de: "Schreiben",
    hi: "लेखन",
  },
  "content-writing": {
    en: "Content Writing",
    fa: "تولید محتوا",
    ar: "كتابة المحتوى",
    es: "Redacción de contenido",
    fr: "Rédaction de contenu",
    de: "Content-Erstellung",
    hi: "कंटेंट राइटिंग",
  },
  translation: {
    en: "Translation",
    fa: "ترجمه",
    ar: "الترجمة",
    es: "Traducción",
    fr: "Traduction",
    de: "Übersetzung",
    hi: "अनुवाद",
  },
  "customer-service": {
    en: "Customer Service",
    fa: "خدمات مشتری",
    ar: "خدمة العملاء",
    es: "Servicio al cliente",
    fr: "Service client",
    de: "Kundendienst",
    hi: "ग्राहक सेवा",
  },
  retail: {
    en: "Retail",
    fa: "خرده‌فروشی",
    ar: "التجزئة",
    es: "Comercio minorista",
    fr: "Commerce de détail",
    de: "Einzelhandel",
    hi: "रिटेल",
  },
  hospitality: {
    en: "Hospitality",
    fa: "مهمان‌نوازی",
    ar: "الضيافة",
    es: "Hostelería",
    fr: "Hôtellerie",
    de: "Gastgewerbe",
    hi: "आतिथ्य",
  },
  "construction": {
    en: "Construction",
    fa: "ساخت‌وساز",
    ar: "البناء",
    es: "Construcción",
    fr: "Construction",
    de: "Bauwesen",
    hi: "निर्माण",
  },
  engineering_other: {
    en: "Other Engineering",
    fa: "سایر شاخه‌های مهندسی",
    ar: "هندسة أخرى",
    es: "Otra ingeniería",
    fr: "Autre ingénierie",
    de: "Sonstiges Engineering",
    hi: "अन्य इंजीनियरिंग",
  },
  "manufacturing": {
    en: "Manufacturing",
    fa: "تولید و ساخت",
    ar: "التصنيع",
    es: "Fabricación",
    fr: "Fabrication",
    de: "Fertigung",
    hi: "विनिर्माण",
  },
  "logistics": {
    en: "Logistics",
    fa: "لجستیک",
    ar: "اللوجستيات",
    es: "Logística",
    fr: "Logistique",
    de: "Logistik",
    hi: "लॉजिस्टिक्स",
  },
  "admin": {
    en: "Administration",
    fa: "امور اداری",
    ar: "الإدارة",
    es: "Administración",
    fr: "Administration",
    de: "Verwaltung",
    hi: "प्रशासन",
  },
  "research": {
    en: "Research",
    fa: "پژوهش",
    ar: "البحث",
    es: "Investigación",
    fr: "Recherche",
    de: "Forschung",
    hi: "अनुसंधान",
  },
  "science": {
    en: "Science",
    fa: "علوم",
    ar: "العلوم",
    es: "Ciencia",
    fr: "Science",
    de: "Wissenschaft",
    hi: "विज्ञान",
  },
};

/**
 * Resolve a category display label for a given locale.
 *
 * Order of preference:
 *   1. Localized label from the central map (if slug is known)
 *   2. Raw DB name (fallback for employer-created categories)
 *   3. Slug, humanized (last resort)
 */
export function categoryLabel(
  slug: string,
  dbName: string | null | undefined,
  locale: Locale,
): string {
  const normalized = (slug || "").toLowerCase().trim();
  const mapped = CATEGORY_LABELS[normalized]?.[locale];
  if (mapped) return mapped;

  const mappedEn = CATEGORY_LABELS[normalized]?.en;
  if (mappedEn && !dbName) return mappedEn;

  if (dbName && dbName.trim()) return dbName.trim();

  if (mappedEn) return mappedEn;

  // Humanize slug as very last fallback: "customer-support" → "Customer Support"
  if (!normalized) return "";
  return normalized
    .split(/[-_]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
