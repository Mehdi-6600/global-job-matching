/**
 * Profile-aware offline 90-day roadmap — all 7 locales, no EN/locale mix.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import {
  buildCareerProfile,
  highAutomationTasks,
  type ProfileInput,
  type RoleFamily,
} from "@/lib/career-intelligence/profile";

export type OfflineRoadmap = {
  title: string;
  weeks: Array<{ week: string; focus: string; actions: string[] }>;
  resources: string[];
  source: "heuristic";
};

type L7 = Record<CareerRiskLocale, string>;
type L7List = Record<CareerRiskLocale, string[]>;

function t(locale: CareerRiskLocale, table: L7, vars: Record<string, string> = {}): string {
  let s = table[locale] || table.en;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

const WEEK1: L7 = {
  en: "Days 1–30",
  fa: "روزهای ۱–۳۰",
  ar: "الأيام ١–٣٠",
  es: "Días 1–30",
  fr: "Jours 1–30",
  de: "Tage 1–30",
  hi: "दिन 1–30",
};
const WEEK2: L7 = {
  en: "Days 31–60",
  fa: "روزهای ۳۱–۶۰",
  ar: "الأيام ٣١–٦٠",
  es: "Días 31–60",
  fr: "Jours 31–60",
  de: "Tage 31–60",
  hi: "दिन 31–60",
};
const WEEK3: L7 = {
  en: "Days 61–90",
  fa: "روزهای ۶۱–۹۰",
  ar: "الأيام ٦١–٩٠",
  es: "Días 61–90",
  fr: "Jours 61–90",
  de: "Tage 61–90",
  hi: "दिन 61–90",
};

const FALLBACK_GAPS: L7List = {
  en: ["adjacent specialist skill", "workflow automation", "outcome documentation"],
  fa: ["مهارت تخصصی مکمل", "اتوماسیون جریان‌کار", "مستندسازی نتایج"],
  ar: ["مهارة تخصصية مكملة", "أتمتة سير العمل", "توثيق النتائج"],
  es: ["habilidad especializada adyacente", "automatización de flujos", "documentación de resultados"],
  fr: ["compétence spécialisée adjacente", "automatisation des flux", "documentation des résultats"],
  de: ["benachbarte Fachkompetenz", "Workflow-Automatisierung", "Ergebnisdokumentation"],
  hi: ["सहायक विशेषज्ञ कौशल", "वर्कफ़्लो स्वचालन", "परिणाम दस्तावेज़ीकरण"],
};

const FAMILY_RESOURCES: Record<RoleFamily, L7List> = {
  software_engineering: {
    en: ["System design practice", "One real delivery with measurable outcome", "Senior code-review feedback"],
    fa: ["تمرین طراحی سیستم", "یک تحویل واقعی با نتیجه قابل اندازه‌گیری", "بازخورد کد از مهندس ارشد"],
    ar: ["تمرين تصميم الأنظمة", "تسليم حقيقي بنتيجة قابلة للقياس", "مراجعة كود من مهندس أول"],
    es: ["Práctica de diseño de sistemas", "Una entrega real con resultado medible", "Feedback de code review senior"],
    fr: ["Pratique du design système", "Une livraison réelle mesurable", "Retour de revue de code senior"],
    de: ["Systemdesign üben", "Eine reale Lieferung mit messbarem Ergebnis", "Senior-Code-Review-Feedback"],
    hi: ["सिस्टम डिज़ाइन अभ्यास", "मापने योग्य परिणाम वाला वास्तविक डिलीवरी", "सीनियर कोड-रिव्यू फीडबैक"],
  },
  data: {
    en: ["Experiment design resources", "Analytical project on real data", "Feedback from a senior analyst"],
    fa: ["منابع طراحی آزمایش", "پروژه تحلیلی روی داده واقعی", "بازخورد از تحلیلگر ارشد"],
    ar: ["موارد تصميم التجارب", "مشروع تحليلي على بيانات حقيقية", "ملاحظات من محلل أول"],
    es: ["Recursos de diseño de experimentos", "Proyecto analítico con datos reales", "Feedback de analista senior"],
    fr: ["Ressources de design d'expériences", "Projet analytique sur données réelles", "Retour d'un analyste senior"],
    de: ["Ressourcen zum Experimentdesign", "Analyseprojekt mit echten Daten", "Feedback eines Senior-Analysten"],
    hi: ["प्रयोग डिज़ाइन संसाधन", "वास्तविक डेटा पर विश्लेषण परियोजना", "सीनियर एनालिस्ट फीडबैक"],
  },
  design: {
    en: ["UX research resources", "Redesign one real user flow", "Critique with a senior designer"],
    fa: ["منابع پژوهش UX", "بازطراحی یک جریان واقعی کاربر", "نقد با طراح ارشد"],
    ar: ["موارد بحث UX", "إعادة تصميم مسار مستخدم حقيقي", "نقد مع مصمم أول"],
    es: ["Recursos de investigación UX", "Rediseñar un flujo real", "Crítica con diseñador senior"],
    fr: ["Ressources recherche UX", "Refonte d'un parcours réel", "Critique avec un designer senior"],
    de: ["UX-Research-Ressourcen", "Einen echten User-Flow neu gestalten", "Kritik mit Senior-Designer"],
    hi: ["UX रिसर्च संसाधन", "एक वास्तविक यूज़र फ्लो रीडिज़ाइन", "सीनियर डिज़ाइनर के साथ समीक्षा"],
  },
  education: {
    en: ["Learning-design resources", "One differentiated lesson in practice", "Feedback from an experienced teacher"],
    fa: ["منابع طراحی یادگیری", "یک درس متمایز در عمل", "بازخورد از معلم باتجربه"],
    ar: ["موارد تصميم التعلم", "درس متمايز عمليًا", "ملاحظات من معلم خبير"],
    es: ["Recursos de diseño de aprendizaje", "Una lección diferenciada en la práctica", "Feedback de docente experimentado"],
    fr: ["Ressources de conception pédagogique", "Une leçon différenciée en pratique", "Retour d'un enseignant expérimenté"],
    de: ["Lern-Design-Ressourcen", "Eine differenzierte Stunde in der Praxis", "Feedback erfahrener Lehrkraft"],
    hi: ["लर्निंग-डिज़ाइन संसाधन", "एक विभेदित पाठ अभ्यास", "अनुभवी शिक्षक फीडबैक"],
  },
  healthcare: {
    en: ["Protocol quality resources", "Structured clinical documentation practice", "Feedback from a senior clinical peer"],
    fa: ["منابع کیفیت پروتکل", "تمرین مستندسازی بالینی ساخت‌یافته", "بازخورد همکار بالینی ارشد"],
    ar: ["موارد جودة البروتوكول", "ممارسة التوثيق السريري المنظم", "ملاحظات زميل سريري أول"],
    es: ["Recursos de calidad de protocolos", "Práctica de documentación clínica", "Feedback de colega clínico senior"],
    fr: ["Ressources qualité protocoles", "Pratique de documentation clinique structurée", "Retour d'un pair clinique senior"],
    de: ["Protokollqualitäts-Ressourcen", "Strukturierte klinische Dokumentation üben", "Feedback eines klinischen Seniors"],
    hi: ["प्रोटोकॉल गुणवत्ता संसाधन", "संरचित क्लिनिकल दस्तावेज़ अभ्यास", "सीनियर क्लिनिकल साथी फीडबैक"],
  },
  accounting_finance: {
    en: ["Reporting automation resources", "Automate one real reporting workflow", "Feedback from a senior finance peer"],
    fa: ["منابع اتوماسیون گزارش", "اتوماسیون یک جریان گزارش واقعی", "بازخورد همکار مالی ارشد"],
    ar: ["موارد أتمتة التقارير", "أتمتة مسار تقرير حقيقي", "ملاحظات زميل مالية أول"],
    es: ["Recursos de automatización de reporting", "Automatizar un flujo real de reporting", "Feedback de colega financiero senior"],
    fr: ["Ressources d'automatisation du reporting", "Automatiser un flux de reporting réel", "Retour d'un pair finance senior"],
    de: ["Reporting-Automatisierungs-Ressourcen", "Einen echten Reporting-Workflow automatisieren", "Feedback eines Finance-Seniors"],
    hi: ["रिपोर्टिंग स्वचालन संसाधन", "एक वास्तविक रिपोर्टिंग वर्कफ़्लो स्वचालित करें", "सीनियर फाइनेंस साथी फीडबैक"],
  },
  trades: {
    en: ["Safety and certification updates", "Document one full diagnostic case", "Mentorship from an experienced tradesperson"],
    fa: ["به‌روزرسانی ایمنی و گواهی", "مستندسازی یک عیب‌یابی کامل", "منتورشیپ فرد باتجربه"],
    ar: ["تحديثات السلامة والشهادات", "توثيق حالة تشخيص كاملة", "إرشاد من حرفي خبير"],
    es: ["Actualizaciones de seguridad y certificaciones", "Documentar un diagnóstico completo", "Mentoría de un profesional experimentado"],
    fr: ["Mises à jour sécurité et certifications", "Documenter un diagnostic complet", "Mentorat d'un professionnel expérimenté"],
    de: ["Sicherheits- und Zertifikats-Updates", "Einen vollen Diagnose-Fall dokumentieren", "Mentoring durch erfahrene Fachkraft"],
    hi: ["सुरक्षा और प्रमाणन अपडेट", "एक पूर्ण डायग्नोस्टिक केस दस्तावेज़ करें", "अनुभवी ट्रेड्समैन मेंटरशिप"],
  },
  operations_clerical: {
    en: ["Process and no-code automation resources", "Improve one repetitive workflow", "Feedback from an operations lead"],
    fa: ["منابع فرایند و اتوماسیون بدون‌کد", "بهبود یک جریان تکراری", "بازخورد مسئول عملیات"],
    ar: ["موارد العمليات وأتمتة دون كود", "تحسين مسار متكرر", "ملاحظات من قائد عمليات"],
    es: ["Recursos de procesos y automatización no-code", "Mejorar un flujo repetitivo", "Feedback de un lead de operaciones"],
    fr: ["Ressources process et no-code", "Améliorer un flux répétitif", "Retour d'un responsable opérations"],
    de: ["Prozess- und No-Code-Ressourcen", "Einen wiederholenden Workflow verbessern", "Feedback einer Operations-Leitung"],
    hi: ["प्रक्रिया और नो-कोड स्वचालन संसाधन", "एक दोहराव वाला वर्कफ़्लो सुधारें", "ऑपरेशन्स लीड फीडबैक"],
  },
  sales_marketing: {
    en: ["Consultative selling resources", "One measurable pipeline experiment", "Feedback from a senior commercial peer"],
    fa: ["منابع فروش مشاوره‌ای", "یک آزمایش قیف قابل اندازه‌گیری", "بازخورد همکار تجاری ارشد"],
    ar: ["موارد البيع الاستشاري", "تجربة مسار مبيعات قابلة للقياس", "ملاحظات زميل تجاري أول"],
    es: ["Recursos de venta consultiva", "Un experimento de pipeline medible", "Feedback de colega comercial senior"],
    fr: ["Ressources de vente consultative", "Une expérience de pipeline mesurable", "Retour d'un pair commercial senior"],
    de: ["Beratende Verkaufs-Ressourcen", "Ein messbares Pipeline-Experiment", "Feedback eines Commercial-Seniors"],
    hi: ["परामर्शात्मक बिक्री संसाधन", "एक मापने योग्य पाइपलाइन प्रयोग", "सीनियर कमर्शियल साथी फीडबैक"],
  },
  management: {
    en: ["Coaching and prioritization frameworks", "One structured coaching conversation", "Feedback from a leadership mentor"],
    fa: ["چارچوب کوچینگ و اولویت‌بندی", "یک گفت‌وگوی کوچینگ ساخت‌یافته", "بازخورد منتور رهبری"],
    ar: ["أطر التدريب وتحديد الأولويات", "محادثة تدريب منظمة", "ملاحظات من مرشد قيادي"],
    es: ["Marcos de coaching y priorización", "Una conversación de coaching estructurada", "Feedback de mentor de liderazgo"],
    fr: ["Cadres de coaching et priorisation", "Une conversation de coaching structurée", "Retour d'un mentor leadership"],
    de: ["Coaching- und Priorisierungs-Frameworks", "Ein strukturiertes Coaching-Gespräch", "Feedback eines Leadership-Mentors"],
    hi: ["कोचिंग और प्राथमिकता फ्रेमवर्क", "एक संरचित कोचिंग बातचीत", "लीडरशिप मेंटर फीडबैक"],
  },
  generic: {
    en: ["Role-family learning resources", "Hands-on project on real work", "Peer or mentor feedback"],
    fa: ["منابع خانواده شغلی", "پروژه عملی روی کار واقعی", "بازخورد همکار یا منتور"],
    ar: ["موارد عائلة الدور", "مشروع عملي على عمل حقيقي", "ملاحظات زميل أو مرشد"],
    es: ["Recursos de la familia de rol", "Proyecto práctico en trabajo real", "Feedback de par o mentor"],
    fr: ["Ressources de la famille de rôle", "Projet pratique sur du vrai travail", "Retour pair ou mentor"],
    de: ["Rollenfamilien-Lernressourcen", "Praxisprojekt an realer Arbeit", "Peer- oder Mentor-Feedback"],
    hi: ["रोल-परिवार शिक्षण संसाधन", "वास्तविक कार्य पर हैंड्स-ऑन परियोजना", "सहकर्मी या मेंटर फीडबैक"],
  },
};

export function buildOfflineRoadmap(
  input: ProfileInput & { skillsToBuild?: string[] }
): OfflineRoadmap {
  const locale = normalizeCareerLocale(input.locale);
  const profile = buildCareerProfile(input);
  const exposed = highAutomationTasks(profile);
  const gapsBase =
    input.skillsToBuild && input.skillsToBuild.length > 0
      ? input.skillsToBuild.slice(0, 6)
      : profile.missingSkills.slice(0, 6);
  const fb = FALLBACK_GAPS[locale] || FALLBACK_GAPS.en;
  const g1 = gapsBase[0] || fb[0];
  const g2 = gapsBase[1] || fb[1];
  const g3 = gapsBase[2] || fb[2];
  const exposeLabel = exposed[0]?.label || t(locale, {
    en: "repetitive tasks",
    fa: "وظایف تکراری",
    ar: "مهام متكررة",
    es: "tareas repetitivas",
    fr: "tâches répétitives",
    de: "wiederkehrende Aufgaben",
    hi: "दोहराव वाले कार्य",
  });
  const target = profile.targetRole;
  const role = profile.currentRole;

  const title = target
    ? t(
        locale,
        {
          en: `90-day roadmap: «{role}» → «{target}»`,
          fa: `نقشه راه ۹۰روزه: از «{role}» به «{target}»`,
          ar: `خارطة طريق ٩٠ يومًا: من «{role}» إلى «{target}»`,
          es: `Hoja de ruta 90 días: «{role}» → «{target}»`,
          fr: `Feuille de route 90 jours : «{role}» → «{target}»`,
          de: `90-Tage-Roadmap: «{role}» → «{target}»`,
          hi: `90-दिन रोडमैप: «{role}» → «{target}»`,
        },
        { role, target }
      )
    : t(
        locale,
        {
          en: `90-day roadmap for «{role}» (no target role provided)`,
          fa: `نقشه راه ۹۰روزه برای «{role}» (هدف شغلی مشخص نشده)`,
          ar: `خارطة طريق ٩٠ يومًا لـ «{role}» (لم يُحدد الدور المستهدف)`,
          es: `Hoja de ruta 90 días para «{role}» (sin rol objetivo)`,
          fr: `Feuille de route 90 jours pour «{role}» (pas de rôle cible)`,
          de: `90-Tage-Roadmap für «{role}» (kein Zielrolle angegeben)`,
          hi: `«{role}» के लिए 90-दिन रोडमैप (लक्ष्य भूमिका नहीं)`,
        },
        { role }
      );

  const y = profile.yearsExperience;
  const paceNote =
    y != null && y < 3
      ? t(locale, {
          en: "With under 3 years’ experience, keep learning volume realistic.",
          fa: "با سابقه کمتر از ۳ سال، حجم یادگیری را واقع‌بینانه نگه دارید.",
          ar: "مع أقل من 3 سنوات خبرة، اجعل حجم التعلم واقعيًا.",
          es: "Con menos de 3 años de experiencia, mantén un ritmo de aprendizaje realista.",
          fr: "Avec moins de 3 ans d'expérience, gardez un volume d'apprentissage réaliste.",
          de: "Bei unter 3 Jahren Erfahrung das Lernvolumen realistisch halten.",
          hi: "3 वर्ष से कम अनुभव पर सीखने की मात्रा यथार्थवादी रखें।",
        })
      : y != null && y >= 10
        ? t(locale, {
            en: "With substantial tenure, prioritize domain leadership and knowledge transfer—not only new tools.",
            fa: "با سابقه بالا، روی رهبری دامنه و انتقال دانش تمرکز کنید نه فقط ابزار جدید.",
            ar: "مع خبرة طويلة، ركّز على قيادة المجال ونقل المعرفة لا الأدوات الجديدة فقط.",
            es: "Con mucha antigüedad, prioriza liderazgo de dominio y transferencia de conocimiento, no solo herramientas.",
            fr: "Avec une longue expérience, priorisez le leadership de domaine et le transfert de savoir, pas seulement les outils.",
            de: "Bei langer Berufserfahrung Domain-Leadership und Wissenstransfer priorisieren — nicht nur neue Tools.",
            hi: "लंबे अनुभव पर डोमेन लीडरशिप और ज्ञान हस्तांतरण प्राथमिकता दें—केवल नए टूल नहीं।",
          })
        : null;

  const family = profile.targetRoleFamily || profile.roleFamily;
  const resources = (FAMILY_RESOURCES[family] || FAMILY_RESOURCES.generic)[locale]
    || FAMILY_RESOURCES.generic.en;

  const focus1 = target
    ? t(locale, {
        en: `Gap toward «{target}»: {g1}`,
        fa: `شکاف به سمت «{target}»: {g1}`,
        ar: `الفجوة نحو «{target}»: {g1}`,
        es: `Brecha hacia «{target}»: {g1}`,
        fr: `Écart vers «{target}» : {g1}`,
        de: `Lücke Richtung «{target}»: {g1}`,
        hi: `«{target}» की ओर अंतराल: {g1}`,
      }, { target, g1 })
    : t(locale, {
        en: `Resilience foundation: {g1}`,
        fa: `پایه مقاوم‌سازی: {g1}`,
        ar: `أساس المرونة: {g1}`,
        es: `Base de resiliencia: {g1}`,
        fr: `Base de résilience : {g1}`,
        de: `Resilienz-Grundlage: {g1}`,
        hi: `लचीलापन आधार: {g1}`,
      }, { g1 });

  const action1a = target
    ? t(locale, {
        en: `One-pager: competencies for «{target}» vs current «{role}»`,
        fa: `شایستگی‌های «{target}» را در برابر نقش فعلی «{role}» در یک صفحه فهرست کنید`,
        ar: `صفحة واحدة: كفاءات «{target}» مقابل الدور الحالي «{role}»`,
        es: `Una página: competencias de «{target}» vs rol actual «{role}»`,
        fr: `Une page : compétences «{target}» vs rôle actuel «{role}»`,
        de: `Einseiter: Kompetenzen für «{target}» vs. aktuelle Rolle «{role}»`,
        hi: `एक पेज: «{target}» बनाम वर्तमान «{role}» की क्षमताएँ`,
      }, { target, role })
    : t(locale, {
        en: `Map gap «{g1}» against role «{role}»`,
        fa: `شکاف «{g1}» را نسبت به نقش «{role}» بنویسید`,
        ar: `ارسم فجوة «{g1}» مقابل الدور «{role}»`,
        es: `Mapea la brecha «{g1}» frente al rol «{role}»`,
        fr: `Cartographiez l'écart «{g1}» par rapport au rôle «{role}»`,
        de: `Lücke «{g1}» gegenüber Rolle «{role}» abbilden`,
        hi: `«{g1}» अंतराल को भूमिका «{role}» के विरुद्ध मैप करें`,
      }, { g1, role });

  const action1b = t(locale, {
    en: `Baseline metrics for high-exposure task «{expose}»`,
    fa: `برای وظیفه پرریسک «{expose}» معیار قبل/بعد تعریف کنید`,
    ar: `مقاييس أساسية للمهمة عالية التعرض «{expose}»`,
    es: `Métricas base para la tarea de alta exposición «{expose}»`,
    fr: `Métriques de base pour la tâche à forte exposition «{expose}»`,
    de: `Ausgangswerte für risikoreiche Aufgabe «{expose}»`,
    hi: `उच्च-जोखिम कार्य «{expose}» के लिए आधार मेट्रिक्स`,
  }, { expose: exposeLabel });

  const action1c = t(locale, {
    en: `3 focused practice sessions per week on {g1}`,
    fa: `هفته‌ای ۳ جلسه تمرین متمرکز روی {g1}`,
    ar: `3 جلسات تدريب مركّزة أسبوعيًا على {g1}`,
    es: `3 sesiones de práctica semanales centradas en {g1}`,
    fr: `3 sessions de pratique ciblées par semaine sur {g1}`,
    de: `3 fokussierte Übungen pro Woche zu {g1}`,
    hi: `प्रति सप्ताह {g1} पर 3 केंद्रित अभ्यास सत्र`,
  }, { g1 });

  const focus2 = t(locale, {
    en: `Apply: {g2}`,
    fa: `کاربردی‌سازی: {g2}`,
    ar: `تطبيق: {g2}`,
    es: `Aplicar: {g2}`,
    fr: `Appliquer : {g2}`,
    de: `Anwenden: {g2}`,
    hi: `लागू करें: {g2}`,
  }, { g2 });

  const action2a = t(locale, {
    en: `Ship a workflow that partially automates «{expose}»`,
    fa: `یک جریان‌کار که بخشی از «{expose}» را نیمه‌خودکار کند بسازید`,
    ar: `أنشئ مسار عمل يؤتمت جزئيًا «{expose}»`,
    es: `Entrega un flujo que automatice parcialmente «{expose}»`,
    fr: `Livrez un flux qui automatise partiellement «{expose}»`,
    de: `Liefern Sie einen Workflow, der «{expose}» teilweise automatisiert`,
    hi: `एक वर्कफ़्लो बनाएँ जो «{expose}» को आंशिक रूप से स्वचालित करे`,
  }, { expose: exposeLabel });

  const action2b = target
    ? t(locale, {
        en: `Portfolio piece that evidences progress toward «{target}»`,
        fa: `یک نمونه‌کار که نشان دهد به «{target}» نزدیک می‌شوید ارائه دهید`,
        ar: `قطعة محفظة تُظهر التقدم نحو «{target}»`,
        es: `Pieza de portafolio que evidencie progreso hacia «{target}»`,
        fr: `Pièce de portfolio prouvant le progrès vers «{target}»`,
        de: `Portfolio-Stück als Nachweis des Fortschritts zu «{target}»`,
        hi: `«{target}» की ओर प्रगति दिखाने वाला पोर्टफोलियो टुकड़ा`,
      }, { target })
    : t(locale, {
        en: `Apply {g2} on real work artifacts`,
        fa: `مهارت {g2} را روی کار واقعی اعمال کنید`,
        ar: `طبّق {g2} على أعمال حقيقية`,
        es: `Aplica {g2} en artefactos de trabajo reales`,
        fr: `Appliquez {g2} sur de vrais livrables`,
        de: `{g2} an realen Arbeitsartefakten anwenden`,
        hi: `वास्तविक कार्य पर {g2} लागू करें`,
      }, { g2 });

  const skill0 = profile.skills[0];
  const action2c = skill0
    ? t(locale, {
        en: `Combine existing «{skill}» with {g2}`,
        fa: `مهارت فعلی «{skill}» را با {g2} ترکیب کنید`,
        ar: `ادمج المهارة الحالية «{skill}» مع {g2}`,
        es: `Combina «{skill}» existente con {g2}`,
        fr: `Combinez «{skill}» existant avec {g2}`,
        de: `Vorhandenes «{skill}» mit {g2} kombinieren`,
        hi: `मौजूदा «{skill}» को {g2} के साथ जोड़ें`,
      }, { skill: skill0, g2 })
    : t(locale, {
        en: `Document a before/after process improvement`,
        fa: `یک بهبود فرایند قبل/بعد مستند کنید`,
        ar: `وثّق تحسين عملية قبل/بعد`,
        es: `Documenta una mejora de proceso antes/después`,
        fr: `Documentez une amélioration de process avant/après`,
        de: `Vorher/Nachher-Prozessverbesserung dokumentieren`,
        hi: `पहले/बाद प्रक्रिया सुधार दस्तावेज़ करें`,
      });

  const focus3 = t(locale, {
    en: `Market readiness and {g3}`,
    fa: `بازار کار و {g3}`,
    ar: `الجاهزية للسوق و{g3}`,
    es: `Preparación de mercado y {g3}`,
    fr: `Préparation marché et {g3}`,
    de: `Marktreife und {g3}`,
    hi: `बाज़ार तैयारी और {g3}`,
  }, { g3 });

  const action3a = target
    ? t(locale, {
        en: `Rewrite resume for title «{target}» using outcomes on «{expose}»`,
        fa: `رزومه را برای عنوان «{target}» با نتایج «{expose}» بازنویسی کنید`,
        ar: `أعد كتابة السيرة لعنوان «{target}» باستخدام نتائج «{expose}»`,
        es: `Reescribe el CV para el título «{target}» con resultados de «{expose}»`,
        fr: `Réécrivez le CV pour le titre «{target}» avec les résultats sur «{expose}»`,
        de: `Lebenslauf für Titel «{target}» mit Ergebnissen zu «{expose}» neu schreiben`,
        hi: `«{expose}» के परिणामों से शीर्षक «{target}» के लिए रिज़्यूमे फिर लिखें`,
      }, { target, expose: exposeLabel })
    : t(locale, {
        en: `Update resume around «{expose}» and {g1}`,
        fa: `رزومه را حول نتایج «{expose}» و {g1} به‌روز کنید`,
        ar: `حدّث السيرة حول «{expose}» و{g1}`,
        es: `Actualiza el CV en torno a «{expose}» y {g1}`,
        fr: `Mettez à jour le CV autour de «{expose}» et {g1}`,
        de: `Lebenslauf um «{expose}» und {g1} aktualisieren`,
        hi: `«{expose}» और {g1} के इर्द-गिर्द रिज़्यूमे अपडेट करें`,
      }, { expose: exposeLabel, g1 });

  const action3b = t(locale, {
    en: `Target 3 roles aligned with {family}`,
    fa: `۳ موقعیت هم‌تراز با {family} هدف بگیرید`,
    ar: `استهدف 3 أدوار متوافقة مع {family}`,
    es: `Apunta a 3 roles alineados con {family}`,
    fr: `Visez 3 rôles alignés sur {family}`,
    de: `3 Rollen passend zu {family} anvisieren`,
    hi: `{family} से जुड़े 3 रोल लक्षित करें`,
  }, { family });

  const action3c = t(locale, {
    en: `Interview story: problem → {g1}/{g2} → result`,
    fa: `داستان مصاحبه: مشکل → {g1}/{g2} → نتیجه`,
    ar: `قصة مقابلة: مشكلة → {g1}/{g2} → نتيجة`,
    es: `Historia de entrevista: problema → {g1}/{g2} → resultado`,
    fr: `Histoire d'entretien : problème → {g1}/{g2} → résultat`,
    de: `Interview-Story: Problem → {g1}/{g2} → Ergebnis`,
    hi: `साक्षात्कार कहानी: समस्या → {g1}/{g2} → परिणाम`,
  }, { g1, g2 });

  return {
    title,
    weeks: [
      {
        week: WEEK1[locale] || WEEK1.en,
        focus: focus1,
        actions: [action1a, action1b, action1c, ...(paceNote ? [paceNote] : [])],
      },
      {
        week: WEEK2[locale] || WEEK2.en,
        focus: focus2,
        actions: [action2a, action2b, action2c],
      },
      {
        week: WEEK3[locale] || WEEK3.en,
        focus: focus3,
        actions: [action3a, action3b, action3c],
      },
    ],
    resources,
    source: "heuristic",
  };
}
