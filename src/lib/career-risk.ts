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

function parseSubScores(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    taskAutomation: clampScore(Number(o.taskAutomation)),
    toolMaturity: clampScore(Number(o.toolMaturity)),
    marketAdoption: clampScore(Number(o.marketAdoption)),
    agenticExposure: clampScore(Number(o.agenticExposure)),
  };
}

export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  return clampScore(base + 0.1 * s.agenticExposure);
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
    const obj = parsed.success
      ? parsed.data
      : (raw as Record<string, unknown>);
    const subScores = parseSubScores(
      parsed.success
        ? parsed.data.subScores
        : (obj as { subScores?: unknown }).subScores
    );
    let riskScore = clampScore(
      Number(
        parsed.success
          ? parsed.data.riskScore
          : (obj as { riskScore?: unknown }).riskScore
      )
    );
    const rawScore = Number(
      parsed.success
        ? parsed.data.riskScore
        : (obj as { riskScore?: unknown }).riskScore
    );
    if (subScores && (!Number.isFinite(rawScore) || rawScore === 0)) {
      riskScore = compositeFromSubScores(subScores);
    }
    const summary = String(
      parsed.success
        ? parsed.data.summary
        : (obj as { summary?: unknown }).summary || ""
    ).slice(0, 2500);
    if (!summary) return null;
    const jobTitle = userJobTitle.trim().slice(0, 120);
    return {
      jobTitle,
      riskScore,
      riskLevel: scoreToRiskLevel(riskScore),
      summary,
      reasons: asStringArray(
        parsed.success
          ? parsed.data.reasons
          : (obj as { reasons?: unknown }).reasons,
        10
      ),
      skillsToBuild: asStringArray(
        parsed.success
          ? parsed.data.skillsToBuild
          : (obj as { skillsToBuild?: unknown }).skillsToBuild,
        12
      ),
      alternatives: asStringArray(
        parsed.success
          ? parsed.data.alternatives
          : (obj as { alternatives?: unknown }).alternatives,
        10
      ),
      source: "ai",
      subScores,
      timeHorizon: parsed.success
        ? parsed.data.timeHorizon || "5–10 years"
        : String(
            (obj as { timeHorizon?: unknown }).timeHorizon || "5–10 years"
          ).slice(0, 40),
      confidence:
        parsed.success && parsed.data.confidence != null
          ? clampScore(parsed.data.confidence)
          : undefined,
      industryOutlook: parsed.success
        ? parsed.data.industryOutlook
        : (obj as { industryOutlook?: string }).industryOutlook
          ? String((obj as { industryOutlook?: string }).industryOutlook).slice(
              0,
              500
            )
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
  | "tech"
  | "frontend"
  | "finance"
  | "clerical"
  | "generic";

function detectRoleBucket(title: string, industry: string): RoleBucket {
  const blob = `${normalizeTitle(title)} ${normalizeTitle(industry)}`;
  const care = [
    "physio",
    "physical therapy",
    "physical therapist",
    "physiotherapist",
    "therapist",
    "nurse",
    "doctor",
    "physician",
    "surgeon",
    "caregiver",
    "paramedic",
    "dentist",
    "midwife",
    "occupational therapy",
    "فیزیوتراپ",
    "فیزیوتراپی",
    "پزشک",
    "دکتر",
    "پرستار",
    "جراح",
    "ماما",
    "دندانپزشک",
    "درمانگر",
    "مراقبت",
    "طبيب",
    "دكتور",
    "ممرض",
    "علاج طبيعي",
    "أخصائي علاج",
    "krankenpfleger",
    "arzt",
    "ärztin",
    "physiotherapeut",
    "infirmier",
    "médecin",
    "kinésithérapeute",
    "enfermero",
    "médico",
    "fisioterapeuta",
    "चिकित्सक",
    "नर्स",
    "फिजियो",
  ];
  if (includesAny(blob, care)) return "care";
  const clerical = [
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
    "کارمند اداری",
    "ورود داده",
    "صندوقدار",
    "kassierer",
    "bürokraft",
    "caissier",
    "cajero",
  ];
  if (includesAny(blob, clerical)) return "clerical";
  const frontend = [
    "frontend",
    "front-end",
    "front end",
    "react",
    "ui engineer",
    "ui developer",
    "فرانت",
    "فرانت‌اند",
  ];
  if (includesAny(blob, frontend)) return "frontend";
  const tech = [
    "developer",
    "engineer",
    "software",
    "programmer",
    "devops",
    "backend",
    "full stack",
    "fullstack",
    "data scientist",
    "analyst",
    "برنامه نویس",
    "برنامه‌نویس",
    "مهندس نرم افزار",
    "توسعه دهنده",
    "توسعه‌دهنده",
    "desarrollador",
    "développeur",
    "programmierer",
    "softwareentwickler",
  ];
  if (includesAny(blob, tech)) return "tech";
  const finance = [
    "accountant",
    "bookkeep",
    "accounting",
    "auditor",
    "حسابدار",
    "حسابداری",
    "ممیزی",
    "buchhalter",
    "comptable",
    "contador",
  ];
  if (includesAny(blob, finance)) return "finance";
  return "generic";
}

type CopyPack = {
  defaultTitle: string;
  horizon: string;
  summaryHigh: (title: string) => string;
  summaryMed: (title: string) => string;
  summaryLow: (title: string) => string;
  careReason: string;
  techReason1: string;
  techReason2: string;
  frontendReason: string;
  financeReason: string;
  clericalReason: string;
  seniorReason: string;
  juniorReason: string;
  durableReason: string;
  skillsCare: string[];
  skillsTech: string[];
  skillsFrontend: string[];
  skillsFinance: string[];
  skillsGeneric: string[];
  altCare: string[];
  altTech: string[];
  altFrontend: string[];
  altFinance: string[];
  altGeneric: string[];
  industryLine: (industry: string) => string;
  upgradeMsg: string;
};

const COPY: Record<CareerRiskLocale, CopyPack> = {
  en: {
    defaultTitle: "Your role",
    horizon: "5–10 years",
    summaryHigh: (t) =>
      `${t}: elevated automation exposure over the next 5–10 years. Prioritize skills that complement AI rather than routine tasks.`,
    summaryMed: (t) =>
      `${t}: moderate change from AI and automation is likely. Targeted upskilling can keep the role resilient.`,
    summaryLow: (t) =>
      `${t}: relatively resilient near-term due to hands-on work, judgment, and human interaction—continuous learning still matters.`,
    careReason:
      "Hands-on clinical work, physical assessment, and regulated patient care are difficult to fully automate.",
    techReason1:
      "Software work is being reshaped by AI assistants; routine implementation faces the most pressure.",
    techReason2:
      "People who design systems, own outcomes, and review AI output stay more resilient.",
    frontendReason:
      "UI boilerplate is increasingly tool-generated; differentiation shifts to UX, accessibility, and performance.",
    financeReason:
      "Standard reporting is an automation target; advisory judgment remains more defensible.",
    clericalReason:
      "Repetitive, well-specified office tasks are among the easiest for software and AI to absorb.",
    seniorReason:
      "Longer experience often correlates with judgment and mentoring that are harder to automate.",
    juniorReason:
      "Early-career roles often include standardized tasks that tools can partially cover.",
    durableReason:
      "Building durable, hard-to-automate skills improves long-term resilience.",
    skillsCare: [
      "Evidence-based practice",
      "Patient communication",
      "Interdisciplinary collaboration",
      "Clinical documentation systems",
      "Hands-on clinical skills",
    ],
    skillsTech: [
      "System design",
      "AI-assisted development + review",
      "Testing & quality",
      "Cloud / DevOps",
      "Product thinking",
    ],
    skillsFrontend: [
      "Advanced React / Next.js",
      "Accessibility (a11y)",
      "Web performance",
      "Design systems",
    ],
    skillsFinance: [
      "Financial advisory",
      "ERP literacy",
      "Data storytelling",
    ],
    skillsGeneric: [
      "Digital literacy",
      "Problem solving",
      "Communication",
      "Domain specialization",
    ],
    altCare: [
      "Senior / specialist clinician",
      "Rehab team lead",
      "Sports or orthopedic track",
      "Hybrid in-person + tele-care",
    ],
    altTech: [
      "Full-stack with product ownership",
      "Platform / DevOps engineer",
      "Technical product manager",
      "AI application engineer",
    ],
    altFrontend: ["Design / UX engineer", "Frontend platform specialist"],
    altFinance: ["Financial analyst", "FP&A specialist", "Audit technology"],
    altGeneric: [
      "Adjacent specialist role",
      "Team lead path",
      "Hybrid domain + digital tools",
    ],
    industryLine: (i) =>
      `Industry context: ${i}. Local market conditions may shift the score.`,
    upgradeMsg: "Upgrade to Pro to unlock alternative role recommendations.",
  },
  fa: {
    defaultTitle: "نقش شما",
    horizon: "۵–۱۰ سال",
    summaryHigh: (t) =>
      `نقش «${t}» در افق ۵ تا ۱۰ سال در معرض اتوماسیون نسبتاً بالایی است. روی مهارت‌های مکمل هوش مصنوعی تمرکز کنید.`,
    summaryMed: (t) =>
      `نقش «${t}» با تغییر متوسط ناشی از هوش مصنوعی روبه‌روست. ارتقای هدفمند مهارت‌ها تاب‌آوری را حفظ می‌کند.`,
    summaryLow: (t) =>
      `نقش «${t}» در کوتاه‌مدت نسبتاً مقاوم است؛ به‌خاطر کار حضوری، قضاوت و تعامل انسانی. یادگیری مداوم ضروری است.`,
    careReason:
      "ارزیابی فیزیکی بیمار، درمان دستی و مراقبت تنظیم‌شده به‌سختی به‌طور کامل قابل اتوماسیون است.",
    techReason1:
      "نقش‌های نرم‌افزاری با دستیارهای AI در حال تغییرند؛ کارهای روتین بیشترین فشار را می‌بینند.",
    techReason2:
      "معماری سیستم، مالکیت نتیجه و بازبینی خروجی AI تاب‌آوری را بالا می‌برد.",
    frontendReason:
      "تولید خودکار UI در حال رشد است؛ تمایز در UX، دسترسی‌پذیری و کارایی است.",
    financeReason:
      "گزارش‌گیری استاندارد هدف اتوماسیون است؛ مشاوره مالی دفاع‌پذیرتر است.",
    clericalReason: "کارهای اداری تکراری از آسان‌ترین اهداف AI هستند.",
    seniorReason: "سابقه بالاتر معمولاً با قضاوت و مربی‌گری همراه است.",
    juniorReason: "نقش‌های تازه‌کار اغلب کارهای استانداردتری دارند.",
    durableReason: "مهارت‌های بادوام، تاب‌آوری بلندمدت را بالا می‌برند.",
    skillsCare: [
      "درمان مبتنی بر شواهد",
      "ارتباط با بیمار",
      "همکاری بین‌رشته‌ای",
      "مستندسازی بالینی",
      "مهارت‌های دستی",
    ],
    skillsTech: [
      "معماری سیستم",
      "توسعه با AI + بازبینی",
      "تست و کیفیت",
      "ابری / DevOps",
      "نگاه محصولی",
    ],
    skillsFrontend: [
      "React / Next.js پیشرفته",
      "دسترسی‌پذیری",
      "بهینه‌سازی وب",
      "سیستم طراحی",
    ],
    skillsFinance: ["مشاوره مالی", "سواد ERP", "روایت داده"],
    skillsGeneric: ["سواد دیجیتال", "حل مسئله", "ارتباطات", "تخصص حوزه‌ای"],
    altCare: [
      "فیزیوتراپیست ارشد",
      "سرپرست توانبخشی",
      "مسیر ورزشی/ارتوپدی",
      "ترکیب حضوری و از راه دور",
    ],
    altTech: [
      "فول‌استک با مالکیت محصول",
      "DevOps / پلتفرم",
      "مدیر محصول فنی",
      "مهندس کاربرد AI",
    ],
    altFrontend: ["مهندس UX", "متخصص پلتفرم فرانت"],
    altFinance: ["تحلیلگر مالی", "FP&A", "فناوری حسابرسی"],
    altGeneric: ["نقش مجاور تخصصی", "مسیر سرپرستی", "تخصص + ابزار دیجیتال"],
    industryLine: (i) =>
      `زمینه صنعت: ${i}. شرایط بازار محلی می‌تواند امتیاز را جابه‌جا کند.`,
    upgradeMsg: "برای مسیرهای جایگزین، به پلن Pro ارتقا دهید.",
  },
  ar: {
    defaultTitle: "دورك",
    horizon: "٥–١٠ سنوات",
    summaryHigh: (t) =>
      `${t}: تعرض مرتفع للأتمتة خلال ٥–١٠ سنوات. ركّز على مهارات تكمل الذكاء الاصطناعي.`,
    summaryMed: (t) =>
      `${t}: تغيّر متوسط متوقع بسبب الذكاء الاصطناعي. تطوير المهارات المستهدف يدعم المرونة.`,
    summaryLow: (t) =>
      `${t}: مرن نسبيًا على المدى القريب بسبب العمل اليدوي والحكم والتفاعل الإنساني.`,
    careReason:
      "التقييم السريري العملي ورعاية المرضى المنظّمة يصعب أتمتتها بالكامل.",
    techReason1: "أدوار البرمجيات تتغير مع مساعدي الذكاء الاصطناعي.",
    techReason2: "من يصممون الأنظمة ويراجعون مخرجات AI أكثر مرونة.",
    frontendReason: "واجهات المستخدم تُولَّد آليًا أكثر؛ التميّز في UX والأداء.",
    financeReason: "التقارير القياسية هدف للأتمتة؛ الاستشارة المالية أقوى دفاعًا.",
    clericalReason: "المهام المكتبية المتكررة من أسهل أهداف الأتمتة.",
    seniorReason: "الخبرة الأطول ترتبط غالبًا بالحكم والإرشاد.",
    juniorReason: "الأدوار المبتدئة تتضمن مهامًا أكثر معيارية.",
    durableReason: "المهارات المستدامة تحسّن المرونة طويلة الأمد.",
    skillsCare: [
      "ممارسة مبنية على الأدلة",
      "التواصل مع المريض",
      "التعاون متعدد التخصصات",
      "التوثيق السريري",
      "مهارات عملية",
    ],
    skillsTech: [
      "تصميم الأنظمة",
      "تطوير بمساعدة AI",
      "الاختبار والجودة",
      "السحابة / DevOps",
      "تفكير المنتج",
    ],
    skillsFrontend: ["React متقدم", "إمكانية الوصول", "أداء الويب", "نظم التصميم"],
    skillsFinance: ["استشارات مالية", "معرفة ERP", "سرد البيانات"],
    skillsGeneric: ["محو الأمية الرقمية", "حل المشكلات", "التواصل", "تخصص المجال"],
    altCare: ["أخصائي سريري أول", "قائد فريق التأهيل", "مسار رياضي", "رعاية هجينة"],
    altTech: ["Full-stack", "DevOps", "مدير منتج تقني", "مهندس تطبيقات AI"],
    altFrontend: ["مهندس UX", "متخصص منصة الواجهة"],
    altFinance: ["محلل مالي", "FP&A", "تقنية التدقيق"],
    altGeneric: ["دور مجاور", "مسار قيادة", "تخصص + أدوات رقمية"],
    industryLine: (i) => `سياق القطاع: ${i}. قد تغيّر ظروف السوق المحلية الدرجة.`,
    upgradeMsg: "قم بالترقية إلى Pro لفتح المسارات البديلة.",
  },
  es: {
    defaultTitle: "Tu rol",
    horizon: "5–10 años",
    summaryHigh: (t) =>
      `${t}: alta exposición a la automatización en 5–10 años. Prioriza habilidades que complementen la IA.`,
    summaryMed: (t) =>
      `${t}: cambio moderado por IA. La mejora de habilidades puede mantener el rol resiliente.`,
    summaryLow: (t) =>
      `${t}: relativamente resiliente a corto plazo por trabajo presencial, juicio e interacción humana.`,
    careReason:
      "La evaluación clínica presencial y el cuidado regulado son difíciles de automatizar por completo.",
    techReason1: "El trabajo de software se transforma con asistentes de IA.",
    techReason2: "Quien diseña sistemas y revisa la salida de IA es más resiliente.",
    frontendReason: "La UI generada por herramientas crece; destaca UX y rendimiento.",
    financeReason: "Los informes estándar son objetivo de automatización.",
    clericalReason: "Tareas de oficina repetitivas son fáciles de automatizar.",
    seniorReason: "Más experiencia suele implicar juicio y mentoría.",
    juniorReason: "Roles junior suelen incluir tareas más estandarizadas.",
    durableReason: "Habilidades duraderas mejoran la resiliencia a largo plazo.",
    skillsCare: [
      "Práctica basada en evidencia",
      "Comunicación con pacientes",
      "Colaboración interdisciplinar",
      "Documentación clínica",
      "Habilidades manuales",
    ],
    skillsTech: [
      "Diseño de sistemas",
      "Desarrollo con IA + revisión",
      "Testing",
      "Cloud / DevOps",
      "Pensamiento de producto",
    ],
    skillsFrontend: ["React avanzado", "Accesibilidad", "Rendimiento web", "Design systems"],
    skillsFinance: ["Asesoría financiera", "ERP", "Narrativa de datos"],
    skillsGeneric: [
      "Alfabetización digital",
      "Resolución de problemas",
      "Comunicación",
      "Especialización",
    ],
    altCare: [
      "Clínico senior",
      "Líder de rehabilitación",
      "Vía deportiva",
      "Atención híbrida",
    ],
    altTech: ["Full-stack", "DevOps", "Product manager técnico", "Ingeniero de IA"],
    altFrontend: ["Ingeniero UX", "Especialista de plataforma front"],
    altFinance: ["Analista financiero", "FP&A", "Tecnología de auditoría"],
    altGeneric: ["Rol adyacente", "Ruta de liderazgo", "Dominio + herramientas digitales"],
    industryLine: (i) =>
      `Contexto del sector: ${i}. El mercado local puede cambiar la puntuación.`,
    upgradeMsg: "Mejora a Pro para desbloquear rutas alternativas.",
  },
  fr: {
    defaultTitle: "Votre rôle",
    horizon: "5–10 ans",
    summaryHigh: (t) =>
      `${t} : forte exposition à l'automatisation sur 5–10 ans. Priorisez des compétences complémentaires à l'IA.`,
    summaryMed: (t) =>
      `${t} : changement modéré lié à l'IA. Une montée en compétences ciblée renforce la résilience.`,
    summaryLow: (t) =>
      `${t} : relativement résilient à court terme grâce au travail pratique, au jugement et à l'interaction humaine.`,
    careReason:
      "L'évaluation clinique pratique et les soins réglementés sont difficiles à automatiser totalement.",
    techReason1: "Les métiers logiciels évoluent avec les assistants IA.",
    techReason2: "Concevoir des systèmes et relire les sorties IA reste différenciant.",
    frontendReason: "L'UI générée augmente ; UX et performance font la différence.",
    financeReason: "Les reportings standards sont des cibles d'automatisation.",
    clericalReason: "Les tâches administratives répétitives s'automatisent facilement.",
    seniorReason: "Plus d'expérience apporte souvent jugement et mentorat.",
    juniorReason: "Les rôles juniors incluent souvent des tâches standardisées.",
    durableReason: "Des compétences durables améliorent la résilience long terme.",
    skillsCare: [
      "Pratique fondée sur les preuves",
      "Communication patient",
      "Collaboration interdisciplinaire",
      "Documentation clinique",
      "Compétences manuelles",
    ],
    skillsTech: [
      "Architecture système",
      "Dev assisté par IA",
      "Tests & qualité",
      "Cloud / DevOps",
      "Product thinking",
    ],
    skillsFrontend: ["React avancé", "Accessibilité", "Performance web", "Design systems"],
    skillsFinance: ["Conseil financier", "ERP", "Data storytelling"],
    skillsGeneric: [
      "Culture numérique",
      "Résolution de problèmes",
      "Communication",
      "Spécialisation",
    ],
    altCare: [
      "Clinicien senior",
      "Responsable rééducation",
      "Piste sport/orthopédie",
      "Soins hybrides",
    ],
    altTech: ["Full-stack", "DevOps", "Product manager technique", "Ingénieur IA"],
    altFrontend: ["Ingénieur UX", "Spécialiste plateforme front"],
    altFinance: ["Analyste financier", "FP&A", "Tech audit"],
    altGeneric: ["Rôle adjacent", "Voie management", "Domaine + outils numériques"],
    industryLine: (i) =>
      `Contexte sectoriel : ${i}. Le marché local peut modifier le score.`,
    upgradeMsg: "Passez à Pro pour débloquer les parcours alternatifs.",
  },
  de: {
    defaultTitle: "Ihre Rolle",
    horizon: "5–10 Jahre",
    summaryHigh: (t) =>
      `${t}: erhöhtes Automatisierungsrisiko in 5–10 Jahren. Setzen Sie auf KI-ergänzende Fähigkeiten.`,
    summaryMed: (t) =>
      `${t}: moderate Veränderungen durch KI. Gezielte Weiterbildung stärkt die Resilienz.`,
    summaryLow: (t) =>
      `${t}: kurzfristig relativ resilient durch Praxis, Urteilsvermögen und menschliche Interaktion.`,
    careReason:
      "Praktische klinische Bewertung und regulierte Patientenversorgung sind schwer vollständig zu automatisieren.",
    techReason1: "Software-Rollen verändern sich durch KI-Assistenten.",
    techReason2: "Systemdesign und Prüfung von KI-Ergebnissen bleiben entscheidend.",
    frontendReason: "UI-Boilerplate wird zunehmend generiert; UX und Performance zählen.",
    financeReason: "Standardreporting ist Automatisierungsziel; Beratung bleibt robuster.",
    clericalReason: "Wiederkehrende Büroaufgaben sind leicht automatisierbar.",
    seniorReason: "Mehr Erfahrung bedeutet oft Urteilskraft und Mentoring.",
    juniorReason: "Junior-Rollen enthalten oft standardisierte Aufgaben.",
    durableReason: "Nachhaltige Fähigkeiten verbessern langfristige Resilienz.",
    skillsCare: [
      "Evidenzbasierte Praxis",
      "Patientenkommunikation",
      "Interdisziplinäre Zusammenarbeit",
      "Klinische Dokumentation",
      "Manuelle Fertigkeiten",
    ],
    skillsTech: [
      "Systemdesign",
      "KI-gestützte Entwicklung",
      "Testing",
      "Cloud / DevOps",
      "Produktdenken",
    ],
    skillsFrontend: ["Fortgeschrittenes React", "Barrierefreiheit", "Web-Performance", "Design Systems"],
    skillsFinance: ["Finanzberatung", "ERP-Kenntnisse", "Data Storytelling"],
    skillsGeneric: [
      "Digitale Kompetenz",
      "Problemlösung",
      "Kommunikation",
      "Fachspezialisierung",
    ],
    altCare: [
      "Senior-Kliniker",
      "Reha-Teamleitung",
      "Sport-/Orthopädie-Pfad",
      "Hybride Versorgung",
    ],
    altTech: ["Full-Stack", "DevOps", "Technical Product Manager", "KI-Anwendungsingenieur"],
    altFrontend: ["UX-Ingenieur", "Frontend-Plattformspezialist"],
    altFinance: ["Finanzanalyst", "FP&A", "Audit-Technologie"],
    altGeneric: ["Benachbarte Fachrolle", "Führungspfad", "Fach + digitale Tools"],
    industryLine: (i) =>
      `Branchenkontext: ${i}. Lokale Märkte können den Score verschieben.`,
    upgradeMsg: "Auf Pro upgraden, um alternative Pfade freizuschalten.",
  },
  hi: {
    defaultTitle: "आपकी भूमिका",
    horizon: "५–१० वर्ष",
    summaryHigh: (t) =>
      `${t}: अगले ५–१० वर्षों में स्वचालन का जोखिम अधिक है। AI के पूरक कौशल पर ध्यान दें।`,
    summaryMed: (t) =>
      `${t}: AI से मध्यम बदलाव संभव है। लक्षित कौशल विकास भूमिका को मजबूत रख सकता है।`,
    summaryLow: (t) =>
      `${t}: हाथों-से काम, निर्णय और मानवीय संवाद के कारण निकट भविष्य में अपेक्षाकृत सुरक्षित।`,
    careReason:
      "नैदानिक मूल्यांकन और नियंत्रित रोगी देखभाल को पूरी तरह स्वचालित करना कठिन है।",
    techReason1: "सॉफ़्टवेयर भूमिकाएँ AI सहायकों से बदल रही हैं।",
    techReason2: "सिस्टम डिज़ाइन और AI आउटपुट की समीक्षा अधिक टिकाऊ है।",
    frontendReason: "UI स्वतः अधिक बन रहा है; UX और प्रदर्शन अलग करते हैं।",
    financeReason: "मानक रिपोर्टिंग स्वचालन का लक्ष्य है; सलाहकार निर्णय मजबूत रहता है।",
    clericalReason: "दोहराए जाने वाले कार्यालयी कार्य आसानी से स्वचालित होते हैं।",
    seniorReason: "अधिक अनुभव अक्सर निर्णय और मार्गदर्शन से जुड़ा होता है।",
    juniorReason: "जूनियर भूमिकाओं में अक्सर मानकीकृत कार्य होते हैं।",
    durableReason: "टिकाऊ कौशल दीर्घकालिक लचीलापन बढ़ाते हैं।",
    skillsCare: [
      "साक्ष्य-आधारित अभ्यास",
      "रोगी संवाद",
      "अंतःविषय सहयोग",
      "नैदानिक दस्तावेज़ीकरण",
      "हस्त कौशल",
    ],
    skillsTech: [
      "सिस्टम डिज़ाइन",
      "AI-सहायता विकास",
      "टेस्टिंग",
      "क्लाउड / DevOps",
      "प्रोडक्ट सोच",
    ],
    skillsFrontend: ["उन्नत React", "एक्सेसिबिलिटी", "वेब प्रदर्शन", "डिज़ाइन सिस्टम"],
    skillsFinance: ["वित्तीय सलाह", "ERP ज्ञान", "डेटा कहानी"],
    skillsGeneric: ["डिजिटल साक्षरता", "समस्या समाधान", "संवाद", "क्षेत्र विशेषज्ञता"],
    altCare: ["सीनियर क्लिनिशियन", "पुनर्वास लीड", "खेल/ऑर्थो ट्रैक", "हाइब्रिड देखभाल"],
    altTech: ["फुल-स्टैक", "DevOps", "टेक्निकल PM", "AI ऐप इंजीनियर"],
    altFrontend: ["UX इंजीनियर", "फ्रंटएंड प्लेटफ़ॉर्म"],
    altFinance: ["वित्तीय विश्लेषक", "FP&A", "ऑडिट टेक"],
    altGeneric: ["समीपवर्ती भूमिका", "लीडership पथ", "डोमेन + डिजिटल टूल"],
    industryLine: (i) =>
      `उद्योग संदर्भ: ${i}. स्थानीय बाज़ार स्कोर बदल सकता है।`,
    upgradeMsg: "वैकल्पिक मार्गों के लिए Pro में अपग्रेड करें।",
  },
};

function packFor(locale: CareerRiskLocale): CopyPack {
  return COPY[locale] || COPY.en;
}

export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string,
  extra?: {
    industry?: string;
    experienceYears?: number;
    country?: string;
    locale?: string;
  }
): CareerRiskAnalysis {
  const locale = normalizeCareerLocale(extra?.locale);
  const pack = packFor(locale);
  const title = (jobTitle || pack.defaultTitle).trim().slice(0, 120);
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

  if (bucket === "care") {
    taskAutomation -= 22;
    agenticExposure -= 18;
    marketAdoption -= 12;
    toolMaturity -= 5;
    reasons.push(pack.careReason);
    skillsToBuild.push(...pack.skillsCare);
    alternatives.push(...pack.altCare);
  } else if (bucket === "clerical") {
    taskAutomation += 30;
    toolMaturity += 20;
    marketAdoption += 25;
    agenticExposure += 15;
    reasons.push(pack.clericalReason);
  } else if (bucket === "tech") {
    taskAutomation += 12;
    toolMaturity += 25;
    marketAdoption += 20;
    agenticExposure += 18;
    reasons.push(pack.techReason1, pack.techReason2);
    skillsToBuild.push(...pack.skillsTech);
    alternatives.push(...pack.altTech);
  } else if (bucket === "frontend") {
    taskAutomation += 18;
    toolMaturity += 28;
    marketAdoption += 22;
    agenticExposure += 16;
    reasons.push(pack.techReason1, pack.frontendReason);
    skillsToBuild.push(...pack.skillsFrontend);
    alternatives.push(...pack.altFrontend);
  } else if (bucket === "finance") {
    taskAutomation += 18;
    toolMaturity += 15;
    marketAdoption += 12;
    reasons.push(pack.financeReason);
    skillsToBuild.push(...pack.skillsFinance);
    alternatives.push(...pack.altFinance);
  }

  if (years != null && years >= 8) {
    taskAutomation -= 5;
    reasons.push(pack.seniorReason);
  } else if (years != null && years <= 2) {
    taskAutomation += 5;
    reasons.push(pack.juniorReason);
  }

  if (skillsToBuild.length === 0) {
    skillsToBuild.push(...pack.skillsGeneric);
    reasons.push(pack.durableReason);
  }
  if (alternatives.length === 0) alternatives.push(...pack.altGeneric);

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);
  const summary =
    score >= 65
      ? pack.summaryHigh(title)
      : score >= 35
        ? pack.summaryMed(title)
        : pack.summaryLow(title);

  return {
    jobTitle: title,
    riskScore: score,
    riskLevel: scoreToRiskLevel(score),
    summary,
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: pack.horizon,
    confidence: bucket === "generic" ? 48 : 62,
    industryOutlook: industry ? pack.industryLine(industry) : undefined,
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
  const pack = packFor(locale);
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
    message: params.paid ? undefined : pack.upgradeMsg,
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
