/**
 * Profile-aware offline 90-day roadmap.
 * Driven by CareerProfile skill gaps + high-automation tasks.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  taskLabel,
  type ProfileInput,
  type RoleFamily,
} from "@/lib/career-intelligence/profile";

/* ------------------------------------------------------------------ */
/* انواع داده                                                          */
/* ------------------------------------------------------------------ */

export type OfflineRoadmap = {
  title: string;
  weeks: Array<{ week: string; focus: string; actions: string[] }>;
  resources: string[];
  source: "heuristic";
};

/** نگاشت لوکال به یک رشته‌ی متنی. */
type LocaleCopy = Record<CareerRiskLocale, string>;

/** نگاشت لوکال به یک آرایه‌ی متنی. */
type LocaleList = Record<CareerRiskLocale, string[]>;

/** نگاشت خانواده‌ی شغلی به منابع، به‌ازای هر لوکال. */
type FamilyResources = Record<RoleFamily, LocaleList>;

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

/* ------------------------------------------------------------------ */
/* منابع پیش‌فرض به‌ازای هر خانواده‌ی شغلی (۷ زبان)                       */
/* ------------------------------------------------------------------ */

const FAMILY_RESOURCES: FamilyResources = {
  software_engineering: {
    en: [
      "Deep software engineering resources (system design, architecture, testing)",
      "Contribute to one real open-source or work project",
      "Code review feedback from a senior engineer",
    ],
    es: [
      "Recursos avanzados de ingeniería de software (diseño de sistemas, arquitectura, pruebas)",
      "Contribuir a un proyecto real de código abierto o laboral",
      "Comentarios de revisión de código de un ingeniero senior",
    ],
    ar: [
      "موارد متقدمة في هندسة البرمجيات (تصميم الأنظمة، المعمارية، الاختبار)",
      "المساهمة في مشروع مفتوح المصدر أو عمل حقيقي",
      "ملاحظات مراجعة الكود من مهندس أول",
    ],
    fa: [
      "منابع عمیق مهندسی نرم‌افزار (طراحی سیستم، معماری، تست)",
      "مشارکت در یک پروژه open-source یا کاری واقعی",
      "بازخورد کد از یک مهندس ارشد",
    ],
    hi: [
      "गहन सॉफ़्टवेयर इंजीनियरिंग संसाधन (सिस्टम डिज़ाइन, आर्किटेक्चर, परीक्षण)",
      "एक वास्तविक ओपन-सोर्स या कार्य परियोजना में योगदान",
      "वरिष्ठ इंजीनियर से कोड समीक्षा प्रतिक्रिया",
    ],
    fr: [
      "Ressources approfondies en ingénierie logicielle (conception système, architecture, tests)",
      "Contribuer à un projet open-source ou professionnel réel",
      "Retour de revue de code d'un ingénieur senior",
    ],
    de: [
      "Vertiefte Software-Engineering-Ressourcen (Systemdesign, Architektur, Testing)",
      "Zu einem echten Open-Source- oder Arbeitsprojekt beitragen",
      "Code-Review-Feedback von einem Senior-Ingenieur",
    ],
  },
  data: {
    en: [
      "Data resources (modeling, experimentation, storytelling)",
      "Analytical project on real organizational data",
      "Feedback from a senior analyst or data scientist",
    ],
    es: [
      "Recursos de datos (modelado, experimentación, narrativa)",
      "Proyecto analítico con datos organizacionales reales",
      "Comentarios de un analista senior o científico de datos",
    ],
    ar: [
      "موارد البيانات (النمذجة، التجريب، سرد البيانات)",
      "مشروع تحليلي على بيانات تنظيمية حقيقية",
      "ملاحظات من محلل أول أو عالم بيانات",
    ],
    fa: [
      "منابع تخصصی داده (مدل‌سازی، آزمایش، روایت داده)",
      "پروژه تحلیلی روی داده واقعی سازمانی",
      "بازخورد از یک تحلیلگر ارشد یا دانشمند داده",
    ],
    hi: [
      "डेटा संसाधन (मॉडलिंग, प्रयोग, डेटा स्टोरीटेलिंग)",
      "वास्तविक संगठनात्मक डेटा पर विश्लेषणात्मक परियोजना",
      "वरिष्ठ विश्लेषक या डेटा वैज्ञानिक से प्रतिक्रिया",
    ],
    fr: [
      "Ressources data (modélisation, expérimentation, narration)",
      "Projet analytique sur des données organisationnelles réelles",
      "Retour d'un analyste senior ou data scientist",
    ],
    de: [
      "Data-Ressourcen (Modellierung, Experimente, Storytelling)",
      "Analytisches Projekt mit echten Organisationsdaten",
      "Feedback von einem Senior-Analysten oder Data Scientist",
    ],
  },
  design: {
    en: [
      "Product design and user research resources",
      "Redesign one real flow in Figma",
      "Critique session with a senior designer or UX mentor",
    ],
    es: [
      "Recursos de diseño de producto e investigación de usuarios",
      "Rediseñar un flujo real en Figma",
      "Sesión de crítica con un diseñador senior o mentor UX",
    ],
    ar: [
      "موارد تصميم المنتج وأبحاث المستخدم",
      "إعادة تصميم تدفق حقيقي في Figma",
      "جلسة نقد مع مصمم أول أو مرشد UX",
    ],
    fa: [
      "منابع طراحی محصول و پژوهش کاربر",
      "بازطراحی یک جریان واقعی در Figma",
      "نقد طرح از یک طراح ارشد یا منتور UX",
    ],
    hi: [
      "उत्पाद डिज़ाइन और उपयोगकर्ता अनुसंधान संसाधन",
      "Figma में एक वास्तविक फ़्लो का पुनर्डिज़ाइन",
      "वरिष्ठ डिज़ाइनर या UX मेंटर के साथ समीक्षा सत्र",
    ],
    fr: [
      "Ressources de design produit et de recherche utilisateur",
      "Refondre un parcours réel dans Figma",
      "Session de critique avec un designer senior ou mentor UX",
    ],
    de: [
      "Produktdesign- und User-Research-Ressourcen",
      "Einen echten Flow in Figma neu gestalten",
      "Kritik-Session mit einem Senior-Designer oder UX-Mentor",
    ],
  },
  education: {
    en: [
      "Teaching and learning-design resources",
      "Run one differentiated lesson in a real classroom",
      "Feedback from an experienced teacher or coach",
    ],
    es: [
      "Recursos de enseñanza y diseño de aprendizaje",
      "Impartir una lección diferenciada en un aula real",
      "Comentarios de un docente o coach experimentado",
    ],
    ar: [
      "موارد التعليم وتصميم التعلم",
      "تنفيذ درس متمايز في فصل حقيقي",
      "ملاحظات من معلم أو مدرب ذي خبرة",
    ],
    fa: [
      "منابع آموزش و طراحی یادگیری",
      "اجرای یک طرح درس متمایز در کلاس واقعی",
      "بازخورد از یک معلم باتجربه یا مربی آموزشی",
    ],
    hi: [
      "शिक्षण और शिक्षण-डिज़ाइन संसाधन",
      "वास्तविक कक्षा में एक विभेदित पाठ संचालित करें",
      "अनुभवी शिक्षक या कोच से प्रतिक्रिया",
    ],
    fr: [
      "Ressources d'enseignement et de conception pédagogique",
      "Animer une leçon différenciée dans une vraie classe",
      "Retour d'un enseignant expérimenté ou coach",
    ],
    de: [
      "Lehr- und Lern-Design-Ressourcen",
      "Eine differenzierte Unterrichtsstunde in einer echten Klasse halten",
      "Feedback von einer erfahrenen Lehrkraft oder einem Coach",
    ],
  },
  healthcare: {
    en: [
      "Clinical resources and current protocols",
      "High-quality clinical documentation practice",
      "Feedback from a senior clinical colleague",
    ],
    es: [
      "Recursos clínicos y protocolos actuales",
      "Práctica de documentación clínica de alta calidad",
      "Comentarios de un colega clínico senior",
    ],
    ar: [
      "موارد سريرية وبروتوكولات حديثة",
      "ممارسة توثيق سريري عالي الجودة",
      "ملاحظات من زميل سريري أول",
    ],
    fa: [
      "منابع بالینی و پروتکل‌های به‌روز",
      "تمرین مستندسازی بالینی با کیفیت",
      "بازخورد از یک همکار بالینی ارشد",
    ],
    hi: [
      "नैदानिक संसाधन और वर्तमान प्रोटोकॉल",
      "उच्च-गुणवत्ता नैदानिक दस्तावेज़ीकरण अभ्यास",
      "वरिष्ठ नैदानिक सहयोगी से प्रतिक्रिया",
    ],
    fr: [
      "Ressources cliniques et protocoles actuels",
      "Pratique de documentation clinique de haute qualité",
      "Retour d'un collègue clinicien senior",
    ],
    de: [
      "Klinische Ressourcen und aktuelle Protokolle",
      "Hochwertige klinische Dokumentationspraxis",
      "Feedback von einem erfahrenen klinischen Kollegen",
    ],
  },
  accounting_finance: {
    en: [
      "Finance/accounting practice resources (reporting, controls)",
      "Automate one real reporting workflow",
      "Feedback from a senior accountant or FP&A mentor",
    ],
    es: [
      "Recursos de práctica financiera/contable (reportes, controles)",
      "Automatizar un flujo real de informes",
      "Comentarios de un contador senior o mentor de FP&A",
    ],
    ar: [
      "موارد ممارسة المالية/المحاسبة (التقارير، الضوابط)",
      "أتمتة سير عمل تقارير حقيقي",
      "ملاحظات من محاسب أول أو مرشد FP&A",
    ],
    fa: [
      "منابع مالی/حسابداری (گزارش‌گری، کنترل‌ها)",
      "اتوماسیون یک جریان گزارش‌دهی واقعی",
      "بازخورد از حسابدار ارشد یا منتور FP&A",
    ],
    hi: [
      "वित्त/लेखा अभ्यास संसाधन (रिपोर्टिंग, नियंत्रण)",
      "एक वास्तविक रिपोर्टिंग वर्कफ़्लो स्वचालित करें",
      "वरिष्ठ लेखाकार या FP&A मेंटर से प्रतिक्रिया",
    ],
    fr: [
      "Ressources de pratique finance/comptabilité (reporting, contrôles)",
      "Automatiser un flux de reporting réel",
      "Retour d'un comptable senior ou mentor FP&A",
    ],
    de: [
      "Finance-/Accounting-Praxisressourcen (Reporting, Kontrollen)",
      "Einen echten Reporting-Workflow automatisieren",
      "Feedback von einem Senior-Buchhalter oder FP&A-Mentor",
    ],
  },
  trades: {
    en: [
      "Trade-specific safety and code updates",
      "Document one diagnostic case end-to-end",
      "Mentorship from an experienced tradesperson",
    ],
    es: [
      "Actualizaciones de seguridad y código específicas del oficio",
      "Documentar un caso de diagnóstico de principio a fin",
      "Mentoría de un profesional experimentado",
    ],
    ar: [
      "تحديثات السلامة والأكواد الخاصة بالمهنة",
      "توثيق حالة تشخيص من البداية إلى النهاية",
      "إرشاد من محترف ذي خبرة",
    ],
    fa: [
      "به‌روزرسانی ایمنی و مقررات تخصصی",
      "مستندسازی یک مورد عیب‌یابی از ابتدا تا انتها",
      "منتورشیپ از فرد باتجربه هم‌حرفه",
    ],
    hi: [
      "ट्रेड-विशिष्ट सुरक्षा और कोड अपडेट",
      "एक निदान मामले को शुरू से अंत तक प्रलेखित करें",
      "अनुभवी ट्रेडस्पर्सन से मेंटरशिप",
    ],
    fr: [
      "Mises à jour sécurité et normes spécifiques au métier",
      "Documenter un cas de diagnostic de bout en bout",
      "Mentorat par un professionnel expérimenté",
    ],
    de: [
      "Berufsspezifische Sicherheits- und Normen-Updates",
      "Einen Diagnosefall von Anfang bis Ende dokumentieren",
      "Mentoring durch eine erfahrene Fachkraft",
    ],
  },
  operations_clerical: {
    en: [
      "Process and no-code automation resources",
      "Improve one repetitive office workflow",
      "Feedback from an operations lead",
    ],
    es: [
      "Recursos de procesos y automatización sin código",
      "Mejorar un flujo de oficina repetitivo",
      "Comentarios de un líder de operaciones",
    ],
    ar: [
      "موارد العمليات والأتمتة بدون كود",
      "تحسين سير عمل مكتبي متكرر",
      "ملاحظات من قائد العمليات",
    ],
    fa: [
      "منابع فرایند و اتوماسیون بدون‌کد",
      "بهبود یک جریان تکراری اداری",
      "بازخورد از مسئول عملیات",
    ],
    hi: [
      "प्रक्रिया और नो-कोड स्वचालन संसाधन",
      "एक दोहराव वाले कार्यालय वर्कफ़्लो में सुधार करें",
      "संचालन प्रमुख से प्रतिक्रिया",
    ],
    fr: [
      "Ressources de processus et d'automatisation no-code",
      "Améliorer un flux de bureau répétitif",
      "Retour d'un responsable des opérations",
    ],
    de: [
      "Prozess- und No-Code-Automatisierungsressourcen",
      "Einen repetitiven Büro-Workflow verbessern",
      "Feedback von einer Operations-Leitung",
    ],
  },
  sales_marketing: {
    en: [
      "Consultative selling / marketing resources",
      "Run one measurable campaign or pipeline experiment",
      "Feedback from a senior commercial peer",
    ],
    es: [
      "Recursos de venta consultiva / marketing",
      "Ejecutar una campaña o experimento de pipeline medible",
      "Comentarios de un par comercial senior",
    ],
    ar: [
      "موارد البيع الاستشاري / التسويق",
      "تنفيذ حملة أو تجربة قنوات قابلة للقياس",
      "ملاحظات من زميل تجاري أول",
    ],
    fa: [
      "منابع فروش مشاوره‌ای / بازاریابی",
      "اجرای یک کمپین یا آزمایش قیف قابل اندازه‌گیری",
      "بازخورد از همکار ارشد تجاری",
    ],
    hi: [
      "परामर्शी बिक्री / मार्केटिंग संसाधन",
      "एक मापनीय अभियान या पाइपलाइन प्रयोग चलाएँ",
      "वरिष्ठ वाणिज्यिक सहकर्मी से प्रतिक्रिया",
    ],
    fr: [
      "Ressources de vente consultative / marketing",
      "Lancer une campagne ou une expérience de pipeline mesurable",
      "Retour d'un pair commercial senior",
    ],
    de: [
      "Beratungsverkauf-/Marketing-Ressourcen",
      "Eine messbare Kampagne oder Pipeline-Experiment durchführen",
      "Feedback von einem erfahrenen kommerziellen Kollegen",
    ],
  },
  management: {
    en: [
      "People-leadership and prioritization resources",
      "Practice one coaching conversation with structure",
      "Feedback from a trusted leadership mentor",
    ],
    es: [
      "Recursos de liderazgo de personas y priorización",
      "Practicar una conversación de coaching con estructura",
      "Comentarios de un mentor de liderazgo de confianza",
    ],
    ar: [
      "موارد قيادة الأفراد وتحديد الأولويات",
      "ممارسة محادثة تدريب منظمة",
      "ملاحظات من مرشد قيادي موثوق",
    ],
    fa: [
      "منابع رهبری افراد و اولویت‌بندی",
      "تمرین یک گفت‌وگوی کوچینگ ساخت‌یافته",
      "بازخورد از منتور رهبری مورد اعتماد",
    ],
    hi: [
      "लोग-नेतृत्व और प्राथमिकता संसाधन",
      "संरचना के साथ एक कोचिंग संवाद का अभ्यास करें",
      "विश्वसनीय नेतृत्व मेंटर से प्रतिक्रिया",
    ],
    fr: [
      "Ressources de leadership et de priorisation",
      "Pratiquer une conversation de coaching structurée",
      "Retour d'un mentor de leadership de confiance",
    ],
    de: [
      "Menschenführungs- und Priorisierungsressourcen",
      "Ein strukturiertes Coaching-Gespräch üben",
      "Feedback von einem vertrauenswürdigen Leadership-Mentor",
    ],
  },
  generic: {
    en: [
      "Role-family learning resources",
      "Hands-on project on real work artifacts",
      "Feedback from one peer or mentor in the same field",
    ],
    es: [
      "Recursos de aprendizaje de la familia de roles",
      "Proyecto práctico con artefactos de trabajo reales",
      "Comentarios de un par o mentor del mismo campo",
    ],
    ar: [
      "موارد تعلم عائلة الأدوار",
      "مشروع عملي على مخرجات عمل حقيقية",
      "ملاحظات من زميل أو مرشد في نفس المجال",
    ],
    fa: [
      "منابع مرتبط با خانواده شغلی",
      "پروژه عملی روی کار واقعی",
      "بازخورد از یک همکار یا منتور هم‌حوزه",
    ],
    hi: [
      "भूमिका-परिवार शिक्षण संसाधन",
      "वास्तविक कार्य आर्टिफ़ैक्ट पर व्यावहारिक परियोजना",
      "एक ही क्षेत्र के सहकर्मी या मेंटर से प्रतिक्रिया",
    ],
    fr: [
      "Ressources d'apprentissage de la famille de rôles",
      "Projet pratique sur des artefacts de travail réels",
      "Retour d'un pair ou mentor du même domaine",
    ],
    de: [
      "Lernressourcen der Rollenfamilie",
      "Praktisches Projekt mit echten Arbeitsartefakten",
      "Feedback von einem Peer oder Mentor im gleichen Feld",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* تابع اصلی                                                           */
/* ------------------------------------------------------------------ */

export function buildOfflineRoadmap(
  input: ProfileInput & { skillsToBuild?: string[] }
): OfflineRoadmap {
  const locale = normalizeCareerLocale(input.locale);
  const profile = buildCareerProfile(input);

  const exposed = highAutomationTasks(profile);

  const gaps =
    input.skillsToBuild && input.skillsToBuild.length > 0
      ? input.skillsToBuild.slice(0, 6)
      : profile.missingSkills.slice(0, 6);

  const g1 =
    gaps[0] ||
    L(locale, {
      en: "adjacent specialist skill",
      es: "habilidad especialista adyacente",
      ar: "مهارة تخصصية مجاورة",
      fa: "مهارت تخصصی مکمل",
      hi: "निकट विशेषज्ञ कौशल",
      fr: "compétence spécialisée adjacente",
      de: "angrenzende Fachkompetenz",
    });

  const g2 =
    gaps[1] ||
    L(locale, {
      en: "workflow automation",
      es: "automatización de flujos",
      ar: "أتمتة سير العمل",
      fa: "اتوماسیون جریان‌کار",
      hi: "वर्कफ़्लो स्वचालन",
      fr: "automatisation des flux",
      de: "Workflow-Automatisierung",
    });

  const g3 =
    gaps[2] ||
    L(locale, {
      en: "outcome documentation",
      es: "documentación de resultados",
      ar: "توثيق النتائج",
      fa: "مستندسازی نتایج",
      hi: "परिणाम दस्तावेज़ीकरण",
      fr: "documentation des résultats",
      de: "Ergebnisdokumentation",
    });

  const exposeLabel = exposed[0]
    ? taskLabel(exposed[0], locale)
    : L(locale, {
        en: "repetitive tasks",
        es: "tareas repetitivas",
        ar: "المهام المتكررة",
        fa: "وظایف تکراری",
        hi: "दोहराव वाले कार्य",
        fr: "tâches répétitives",
        de: "repetitive Aufgaben",
      });

  const title = L(locale, {
    en: `90-day roadmap for ${profile.currentRole}`,
    es: `Hoja de ruta de 90 días para ${profile.currentRole}`,
    ar: `خارطة طريق ٩٠ يوماً لـ ${profile.currentRole}`,
    fa: `نقشه راه ۹۰روزه برای ${profile.currentRole}`,
    hi: `${profile.currentRole} के लिए 90-दिन का रोडमैप`,
    fr: `Feuille de route de 90 jours pour ${profile.currentRole}`,
    de: `90-Tage-Roadmap für ${profile.currentRole}`,
  });

  const resources =
    LList(locale, FAMILY_RESOURCES[profile.roleFamily]) ||
    LList(locale, FAMILY_RESOURCES.generic);

  const gapPair = joinList(gaps.slice(0, 2), locale);
  const leadSkill = profile.skills[0];

  return {
    title,
    weeks: [
      {
        week: L(locale, {
          en: "Days 1–30",
          es: "Días 1–30",
          ar: "الأيام ١–٣٠",
          fa: "روزهای ۱–۳۰",
          hi: "दिन 1–30",
          fr: "Jours 1–30",
          de: "Tage 1–30",
        }),
        focus: L(locale, {
          en: `Foundation: ${g1}`,
          es: `Base: ${g1}`,
          ar: `الأساس: ${g1}`,
          fa: `پایه: ${g1}`,
          hi: `आधार: ${g1}`,
          fr: `Fondation : ${g1}`,
          de: `Grundlage: ${g1}`,
        }),
        actions: [
          L(locale, {
            en: `Write a one-pager mapping gap «${g1}» to your current role «${profile.currentRole}»`,
            es: `Escribe una página mapeando la brecha «${g1}» a tu rol actual «${profile.currentRole}»`,
            ar: `اكتب صفحة واحدة تربط الفجوة «${g1}» بدورك الحالي «${profile.currentRole}»`,
            fa: `شکاف «${g1}» را نسبت به نقش فعلی «${profile.currentRole}» در یک صفحه بنویسید`,
            hi: `«${g1}» अंतर को अपनी वर्तमान भूमिका «${profile.currentRole}» से जोड़ते हुए एक पेज लिखें`,
            fr: `Rédigez une page reliant l'écart « ${g1} » à votre rôle actuel « ${profile.currentRole} »`,
            de: `Schreiben Sie ein One-Pager, das die Lücke «${g1}» mit Ihrer aktuellen Rolle «${profile.currentRole}» verknüpft`,
          }),
          L(locale, {
            en: `Baseline metrics for high-exposure task «${exposeLabel}» (time/errors)`,
            es: `Métricas base para la tarea de alta exposición «${exposeLabel}» (tiempo/errores)`,
            ar: `مقاييس أساسية للمهمة عالية التعرض «${exposeLabel}» (الوقت/الأخطاء)`,
            fa: `برای وظیفه پرریسک «${exposeLabel}» یک نمونه قبل/بعد اندازه‌گیری کنید`,
            hi: `उच्च-जोखिम कार्य «${exposeLabel}» के लिए आधार मेट्रिक्स (समय/त्रुटियाँ)`,
            fr: `Mesures de base pour la tâche à forte exposition « ${exposeLabel} » (temps/erreurs)`,
            de: `Basismetriken für die stark exponierte Aufgabe «${exposeLabel}» (Zeit/Fehler)`,
          }),
          L(locale, {
            en: `Pick 2 concrete learning resources for ${g1}; practice 3 sessions/week`,
            es: `Elige 2 recursos concretos para ${g1}; practica 3 sesiones/semana`,
            ar: `اختر موردين تعليميين محددين لـ ${g1}؛ تدرب ٣ جلسات أسبوعياً`,
            fa: `۲ منبع آموزشی مشخص برای ${g1} انتخاب و هفته‌ای ۳ جلسه تمرین کنید`,
            hi: `${g1} के लिए 2 ठोस शिक्षण संसाधन चुनें; सप्ताह में 3 सत्र अभ्यास करें`,
            fr: `Choisissez 2 ressources concrètes pour ${g1} ; pratiquez 3 sessions/semaine`,
            de: `Wählen Sie 2 konkrete Lernressourcen für ${g1}; üben Sie 3 Sitzungen/Woche`,
          }),
        ],
      },
      {
        week: L(locale, {
          en: "Days 31–60",
          es: "Días 31–60",
          ar: "الأيام ٣١–٦٠",
          fa: "روزهای ۳۱–۶۰",
          hi: "दिन 31–60",
          fr: "Jours 31–60",
          de: "Tage 31–60",
        }),
        focus: L(locale, {
          en: `Apply: ${g2}`,
          es: `Aplicar: ${g2}`,
          ar: `التطبيق: ${g2}`,
          fa: `کاربردی‌سازی: ${g2}`,
          hi: `लागू करें: ${g2}`,
          fr: `Appliquer : ${g2}`,
          de: `Anwenden: ${g2}`,
        }),
        actions: [
          L(locale, {
            en: `Ship a small workflow that partially automates «${exposeLabel}»`,
            es: `Entrega un flujo pequeño que automatice parcialmente «${exposeLabel}»`,
            ar: `أطلق سير عمل صغيراً يؤتمت جزئياً «${exposeLabel}»`,
            fa: `یک جریان‌کار کوچک بسازید که بخشی از «${exposeLabel}» را نیمه‌خودکار کند`,
            hi: `एक छोटा वर्कफ़्लो तैयार करें जो «${exposeLabel}» को आंशिक रूप से स्वचालित करे`,
            fr: `Livrez un petit flux qui automatise partiellement « ${exposeLabel} »`,
            de: `Liefern Sie einen kleinen Workflow, der «${exposeLabel}» teilweise automatisiert`,
          }),
          L(locale, {
            en: `Apply ${g2} on your real work artifacts — not only a course`,
            es: `Aplica ${g2} en tus artefactos de trabajo reales — no solo un curso`,
            ar: `طبّق ${g2} على مخرجات عملك الحقيقية — ليس دورة فقط`,
            fa: `مهارت ${g2} را روی داده یا پروژه واقعی خودتان اعمال کنید (نه فقط دوره)`,
            hi: `${g2} को अपने वास्तविक कार्य आर्टिफ़ैक्ट पर लागू करें — केवल कोर्स पर नहीं`,
            fr: `Appliquez ${g2} sur vos artefacts de travail réels — pas seulement un cours`,
            de: `Wenden Sie ${g2} auf Ihre echten Arbeitsartefakte an — nicht nur einen Kurs`,
          }),
          leadSkill
            ? L(locale, {
                en: `Combine existing skill «${leadSkill}» with ${g2} in a portfolio piece`,
                es: `Combina la habilidad existente «${leadSkill}» con ${g2} en una pieza de portafolio`,
                ar: `اجمع المهارة الحالية «${leadSkill}» مع ${g2} في قطعة محفظة`,
                fa: `مهارت فعلی «${leadSkill}» را با ${g2} ترکیب و در نمونه‌کار نشان دهید`,
                hi: `मौजूदा कौशल «${leadSkill}» को ${g2} के साथ पोर्टफोलियो टुकड़े में संयोजित करें`,
                fr: `Combinez la compétence existante « ${leadSkill} » avec ${g2} dans une pièce de portfolio`,
                de: `Kombinieren Sie die bestehende Fähigkeit «${leadSkill}» mit ${g2} in einem Portfolio-Stück`,
              })
            : L(locale, {
                en: `Produce a short before/after process improvement artifact`,
                es: `Produce un artefacto corto de mejora de proceso antes/después`,
                ar: `أنتج قطعة قصيرة لتحسين العملية قبل/بعد`,
                fa: `یک نمونه‌کار کوتاه از بهبود فرآیند تهیه کنید`,
                hi: `प्रक्रिया सुधार का एक संक्षिप्त पहले/बाद आर्टिफ़ैक्ट तैयार करें`,
                fr: `Produisez un court artefact d'amélioration de processus avant/après`,
                de: `Erstellen Sie ein kurzes Vorher/Nachher-Artefakt zur Prozessverbesserung`,
              }),
        ],
      },
      {
        week: L(locale, {
          en: "Days 61–90",
          es: "Días 61–90",
          ar: "الأيام ٦١–٩٠",
          fa: "روزهای ۶۱–۹۰",
          hi: "दिन 61–90",
          fr: "Jours 61–90",
          de: "Tage 61–90",
        }),
        focus: L(locale, {
          en: `Market readiness and ${g3}`,
          es: `Preparación para el mercado y ${g3}`,
          ar: `الجاهزية للسوق و${g3}`,
          fa: `بازار کار و ${g3}`,
          hi: `बाज़ार तैयारी और ${g3}`,
          fr: `Préparation au marché et ${g3}`,
          de: `Marktreife und ${g3}`,
        }),
        actions: [
          L(locale, {
            en: `Rewrite resume bullets around outcomes on «${exposeLabel}» and ${gapPair}`,
            es: `Reescribe los bullets del CV en torno a resultados en «${exposeLabel}» y ${gapPair}`,
            ar: `أعد كتابة نقاط السيرة حول النتائج على «${exposeLabel}» و${gapPair}`,
            fa: `رزومه را حول نتایج «${exposeLabel}» و مهارت‌های ${gapPair} بازنویسی کنید`,
            hi: `«${exposeLabel}» और ${gapPair} पर परिणामों के इर्द-गिर्द रिज़्यूमे बुलेट्स फिर से लिखें`,
            fr: `Réécrivez les puces du CV autour des résultats sur « ${exposeLabel} » et ${gapPair}`,
            de: `Schreiben Sie Lebenslauf-Punkte um Ergebnisse zu «${exposeLabel}» und ${gapPair} neu`,
          }),
          L(locale, {
            en: `Target 3 roles aligned with family «${profile.roleFamily}»`,
            es: `Apunta a 3 roles alineados con la familia «${profile.roleFamily}»`,
            ar: `استهدف ٣ أدوار متوافقة مع عائلة «${profile.roleFamily}»`,
            fa: `۳ موقعیت هم‌تراز با خانواده شغلی ${profile.roleFamily} را هدف بگیرید`,
            hi: `«${profile.roleFamily}» परिवार से मेल खाती 3 भूमिकाओं को लक्षित करें`,
            fr: `Ciblez 3 rôles alignés sur la famille « ${profile.roleFamily} »`,
            de: `Zielen Sie auf 3 Rollen ab, die zur Familie «${profile.roleFamily}» passen`,
          }),
          L(locale, {
            en: `Interview story: problem → action on ${g1}/${g2} → measurable result`,
            es: `Historia de entrevista: problema → acción sobre ${g1}/${g2} → resultado medible`,
            ar: `قصة المقابلة: المشكلة → الإجراء على ${g1}/${g2} → نتيجة قابلة للقياس`,
            fa: `داستان مصاحبه: مشکل → اقدام روی ${g1}/${g2} → نتیجه`,
            hi: `साक्षात्कार कहानी: समस्या → ${g1}/${g2} पर कार्रवाई → मापनीय परिणाम`,
            fr: `Récit d'entretien : problème → action sur ${g1}/${g2} → résultat mesurable`,
            de: `Interview-Geschichte: Problem → Aktion zu ${g1}/${g2} → messbares Ergebnis`,
          }),
        ],
      },
    ],
    resources,
    source: "heuristic",
  };
}
