/**
 * Shared deterministic Career Intelligence Core.
 *
 * Locale-aware skill-gap generation: FAMILY_GROWTH_SKILLS and SPEC_GROWTH
 * are keyed by locale so a Persian user gets Persian skill names, a German
 * user gets German skill names, and so on. English remains the fallback
 * when a locale entry is missing — no unintended language leakage.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";

export type RoleFamily =
  | "software_engineering"
  | "data"
  | "design"
  | "education"
  | "healthcare"
  | "accounting_finance"
  | "trades"
  | "operations_clerical"
  | "sales_marketing"
  | "management"
  | "generic";

export type Seniority =
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager"
  | "unknown";

export type TaskExposure = {
  id: string;
  label: string;
  automation: number;
  judgment: number;
  interpersonal: number;
  regulatory: number;
};

export type CareerProfile = {
  currentRole: string;
  normalizedRole: string;
  roleFamily: RoleFamily;
  specialization: string | null;
  seniority: Seniority;
  yearsExperience: number | null;
  industry: string | null;
  education: string | null;
  skills: string[];
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  technologies: string[];
  country: string | null;
  location: string | null;
  locale: CareerRiskLocale;
  languages: string[];
  targetRole: string | null;
  targetRoleFamily: RoleFamily | null;
  targetSpecialization: string | null;
  careerGoal: string | null;
  responsibilities: string[];
  tasks: TaskExposure[];
  transferableSkills: string[];
  missingSkills: string[];
  profileCompleteness: number;
  uncertainty: string[];
};

export type ProfileInput = {
  jobTitle?: string | null;
  skills?: string | null;
  industry?: string | null;
  experienceYears?: number | null;
  country?: string | null;
  location?: string | null;
  education?: string | null;
  locale?: string | null;
  targetRole?: string | null;
  careerGoal?: string | null;
  languages?: string | null;
  responsibilities?: string | null;
};

/* ------------------------------------------------------------------ */
/* Localized helpers                                                   */
/* ------------------------------------------------------------------ */

type LocaleTable<T> = Partial<Record<CareerRiskLocale, T>> & { en: T };

function L<T>(locale: CareerRiskLocale, table: LocaleTable<T>): T {
  return (table[locale] ?? table.en) as T;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitList(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,|/;،\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2)
        .slice(0, 40),
    ),
  );
}

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  "java script": "javascript",
  ts: "typescript",
  "type script": "typescript",
  node: "nodejs",
  "node.js": "nodejs",
  "node js": "nodejs",
  reactjs: "react",
  "react.js": "react",
  vuejs: "vue",
  k8s: "kubernetes",
  ps: "photoshop",
  ai: "illustrator",
  "ms excel": "excel",
  "microsoft excel": "excel",
  "power bi": "powerbi",
};

function canonicalSkill(s: string): string {
  const n = norm(s);
  return SKILL_ALIASES[n] || n;
}

function hasCanonical(skills: string[], ...ids: string[]): boolean {
  const set = new Set(skills.map(canonicalSkill));
  return ids.some((id) => set.has(canonicalSkill(id)));
}

const SOFT_SKILL_SET = new Set(
  [
    "communication",
    "leadership",
    "negotiation",
    "teamwork",
    "collaboration",
    "stakeholder management",
    "problem solving",
    "problem-solving",
    "time management",
    "critical thinking",
    "creativity",
    "adaptability",
    "empathy",
    "presentation",
    "mentoring",
    "coaching",
    "classroom management",
    "patient care",
    "ارتباط",
    "رهبری",
    "کار تیمی",
    "مذاکره",
  ].map(norm),
);

const TOOL_SET = new Set(
  [
    "excel",
    "powerpoint",
    "word",
    "photoshop",
    "illustrator",
    "figma",
    "sketch",
    "jira",
    "confluence",
    "slack",
    "docker",
    "kubernetes",
    "terraform",
    "jenkins",
    "github",
    "gitlab",
    "aws",
    "azure",
    "gcp",
    "sap",
    "autocad",
    "tableau",
    "powerbi",
    "notion",
    "salesforce",
  ].map(norm),
);

const TECH_LANG_SET = new Set(
  [
    "python",
    "javascript",
    "typescript",
    "java",
    "csharp",
    "c#",
    "go",
    "golang",
    "rust",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "sql",
    "r",
    "scala",
    "c++",
    "c",
  ].map(norm),
);

const FRAMEWORK_SET = new Set(
  [
    "react",
    "vue",
    "angular",
    "nextjs",
    "next.js",
    "nodejs",
    "django",
    "flask",
    "spring",
    "dotnet",
    ".net",
    "rails",
    "laravel",
    "flutter",
  ].map(norm),
);

function classifySkills(skills: string[]): {
  technicalSkills: string[];
  softSkills: string[];
  tools: string[];
  technologies: string[];
} {
  const technicalSkills: string[] = [];
  const softSkills: string[] = [];
  const tools: string[] = [];
  const technologies: string[] = [];

  for (const raw of skills) {
    const c = canonicalSkill(raw);
    if (SOFT_SKILL_SET.has(c) || SOFT_SKILL_SET.has(norm(raw))) {
      softSkills.push(raw);
      continue;
    }
    if (TOOL_SET.has(c)) {
      tools.push(raw);
      continue;
    }
    if (TECH_LANG_SET.has(c) || FRAMEWORK_SET.has(c)) {
      technicalSkills.push(raw);
      technologies.push(raw);
      continue;
    }
    if (/[a-zA-Z]{2,}/.test(raw) || /[\u0600-\u06FF]{2,}/.test(raw)) {
      technicalSkills.push(raw);
    } else {
      softSkills.push(raw);
    }
  }
  return { technicalSkills, softSkills, tools, technologies };
}

function detectSeniority(title: string, years: number | null): Seniority {
  const t = norm(title);
  if (/\b(intern|junior|entry|جونیور|کارآموز|مبتدی)\b/.test(t))
    return "junior";
  if (/\b(lead|principal|staff|head)\b/.test(t)) return "lead";
  if (/\b(manager|director|مدیر)\b/.test(t)) return "manager";
  if (/\b(senior|sr\.?|ارشد)\b/.test(t)) return "senior";
  if (years != null) {
    if (years < 2) return "junior";
    if (years < 5) return "mid";
    if (years < 10) return "senior";
    return "lead";
  }
  return "unknown";
}

function detectFamily(
  title: string,
  skills: string[],
  industry: string,
): RoleFamily {
  const t = norm(title);
  const blob = `${t} ${skills.map(norm).join(" ")} ${norm(industry)}`;

  if (/\b(engineering|software|product|tech)\s+manager\b/.test(t)) {
    return "software_engineering";
  }
  if (/\b(finance|accounting|financial)\s+manager\b/.test(t) || /cfo/.test(t)) {
    return "accounting_finance";
  }
  if (/\b(hr|people|human resources)\s+manager\b/.test(t)) {
    return "management";
  }
  if (/\b(project|program|product)\s+manager\b/.test(t)) {
    return "management";
  }
  if (/\b(operations)\s+manager\b/.test(t)) {
    return "management";
  }
  if (/\b(office)\s+manager\b/.test(t)) {
    return "operations_clerical";
  }

  if (
    /nurse|پزشک|پرستار|doctor|clinician|therapist|healthcare|مراقبت|بیمار/.test(
      blob,
    )
  ) {
    return "healthcare";
  }
  if (
    /teacher|معلم|آموزش|tutor|instructor|professor|آموزگار|مدرس/.test(blob)
  ) {
    return "education";
  }
  if (
    /account|finance|مالی|حسابدار|tax|audit|bookkeep|cfo|controller/.test(blob)
  ) {
    return "accounting_finance";
  }
  if (
    /design|figma|photoshop|illustrator|ui|ux|گرافیک|طراح|branding/.test(blob)
  ) {
    return "design";
  }
  if (
    /\b(ai engineer|ml engineer|machine learning|data scien|llm|nlp)\b/.test(
      blob,
    ) ||
    /data engineer|analyst|بیگ دیتا|هوش مصنوعی/.test(blob)
  ) {
    return "data";
  }
  if (
    /devop|sre|backend|frontend|full.?stack|software|developer|engineer|react|node|typescript|python|java|برنامه|نرم.?افزار/.test(
      blob,
    )
  ) {
    return "software_engineering";
  }
  if (/electric|plumber|welder|hvac|لوله|جوش|برقکار|نجار|trades/.test(blob)) {
    return "trades";
  }
  if (/sales|marketing|بازاریاب|فروش|seo|content/.test(blob)) {
    return "sales_marketing";
  }

  if (/\b(manager|director|head of|مدیر)\b/.test(t)) {
    return "management";
  }

  if (/operations|admin|منشی|دفتری|clerical|coordinator|secretary/.test(blob)) {
    return "operations_clerical";
  }
  return "generic";
}

function detectSpecialization(
  family: RoleFamily,
  title: string,
  skills: string[],
): string | null {
  const blob = `${norm(title)} ${skills.map(norm).join(" ")}`;

  if (
    /\b(ai|ml|machine learning|deep learning|llm|data scien|nlp|computer vision|هوش مصنوعی)\b/.test(
      blob,
    )
  ) {
    return "ai_ml";
  }
  if (/\b(data engineer|etl|analytics engineer)\b/.test(blob)) {
    return "data_engineering";
  }

  if (family === "software_engineering") {
    if (/full.?stack/.test(blob)) return "full_stack";
    const front = hasCanonical(
      skills,
      "react",
      "vue",
      "angular",
      "nextjs",
      "css",
    );
    const back = hasCanonical(
      skills,
      "nodejs",
      "node",
      "java",
      "spring",
      "django",
      "python",
      ".net",
      "golang",
    );
    if (front && back) return "full_stack";
    if (/devop|kubernetes|docker|terraform|sre|ci\/cd/.test(blob))
      return "devops";
    if (/mobile|ios|android|flutter|react.?native/.test(blob)) return "mobile";
    if (/security|appsec/.test(blob)) return "security";
    if (/qa|test|cypress|selenium/.test(blob)) return "qa";
    if (front || /frontend/.test(blob)) return "frontend";
    if (back || /backend/.test(blob)) return "backend";
  }
  if (family === "accounting_finance") {
    if (/tax|مالیات/.test(blob)) return "tax";
    if (/audit|حسابرسی/.test(blob)) return "audit";
    if (/management account|بهای تمام/.test(blob))
      return "management_accounting";
  }
  if (family === "education") {
    if (/primary|ابتدایی|elementary/.test(blob)) return "primary";
    if (/secondary|متوسطه|high school/.test(blob)) return "secondary";
    if (/edtech|technology|فناوری/.test(blob)) return "edtech";
  }
  if (family === "design") {
    if (/ux|ui|product design|figma/.test(blob)) return "ux_ui";
    if (/brand|identity|لوگو/.test(blob)) return "branding";
  }
  if (family === "healthcare") {
    if (/icu|special|تخصص/.test(blob)) return "specialized";
    if (/hospital|بیمارستان/.test(blob)) return "hospital";
  }
  return null;
}

function tasksForFamily(
  family: RoleFamily,
  spec: string | null,
): TaskExposure[] {
  const base: Record<RoleFamily, TaskExposure[]> = {
    software_engineering: [
      { id: "impl", label: "Feature implementation / coding", automation: 70, judgment: 40, interpersonal: 20, regulatory: 10 },
      { id: "boilerplate", label: "Boilerplate and CRUD", automation: 85, judgment: 15, interpersonal: 10, regulatory: 5 },
      { id: "design", label: "System / API design", automation: 35, judgment: 80, interpersonal: 40, regulatory: 15 },
      { id: "review", label: "Code review and mentoring", automation: 30, judgment: 75, interpersonal: 60, regulatory: 10 },
      { id: "incident", label: "Production incidents", automation: 25, judgment: 85, interpersonal: 50, regulatory: 20 },
      { id: "reqs", label: "Requirements clarification", automation: 20, judgment: 70, interpersonal: 80, regulatory: 10 },
    ],
    accounting_finance: [
      { id: "entry", label: "Invoice / data entry", automation: 90, judgment: 15, interpersonal: 10, regulatory: 30 },
      { id: "recon", label: "Reconciliation", automation: 75, judgment: 40, interpersonal: 15, regulatory: 40 },
      { id: "report", label: "Financial reporting packs", automation: 65, judgment: 50, interpersonal: 30, regulatory: 55 },
      { id: "tax", label: "Tax interpretation", automation: 40, judgment: 80, interpersonal: 35, regulatory: 90 },
      { id: "advise", label: "Client / stakeholder advisory", automation: 20, judgment: 85, interpersonal: 90, regulatory: 50 },
      { id: "control", label: "Controls and exception handling", automation: 45, judgment: 75, interpersonal: 40, regulatory: 70 },
    ],
    education: [
      { id: "lesson", label: "Lesson delivery / facilitation", automation: 25, judgment: 75, interpersonal: 90, regulatory: 40 },
      { id: "plan", label: "Lesson planning", automation: 45, judgment: 70, interpersonal: 30, regulatory: 35 },
      { id: "assess", label: "Assessment and feedback", automation: 50, judgment: 70, interpersonal: 60, regulatory: 40 },
      { id: "admin", label: "Admin / attendance / reports", automation: 70, judgment: 25, interpersonal: 25, regulatory: 30 },
      { id: "pastoral", label: "Pastoral / parent communication", automation: 15, judgment: 80, interpersonal: 95, regulatory: 45 },
      { id: "diff", label: "Differentiation for learners", automation: 30, judgment: 85, interpersonal: 70, regulatory: 35 },
    ],
    healthcare: [
      { id: "hands", label: "Hands-on patient care", automation: 15, judgment: 85, interpersonal: 90, regulatory: 85 },
      { id: "doc", label: "Clinical documentation", automation: 55, judgment: 50, interpersonal: 20, regulatory: 80 },
      { id: "triage", label: "Triage / prioritization", automation: 30, judgment: 90, interpersonal: 70, regulatory: 85 },
      { id: "coord", label: "Care coordination", automation: 25, judgment: 75, interpersonal: 85, regulatory: 70 },
      { id: "med", label: "Medication / protocol adherence", automation: 35, judgment: 70, interpersonal: 40, regulatory: 95 },
    ],
    design: [
      { id: "produce", label: "Asset production", automation: 55, judgment: 40, interpersonal: 20, regulatory: 5 },
      { id: "concept", label: "Concept / creative direction", automation: 25, judgment: 85, interpersonal: 50, regulatory: 5 },
      { id: "research", label: "User research synthesis", automation: 30, judgment: 80, interpersonal: 60, regulatory: 5 },
      { id: "system", label: "Design systems", automation: 40, judgment: 70, interpersonal: 40, regulatory: 5 },
      { id: "stake", label: "Stakeholder critique", automation: 15, judgment: 75, interpersonal: 90, regulatory: 5 },
    ],
    data: [
      { id: "etl", label: "ETL / pipelines", automation: 60, judgment: 50, interpersonal: 20, regulatory: 15 },
      { id: "analysis", label: "Exploratory analysis", automation: 45, judgment: 75, interpersonal: 30, regulatory: 10 },
      { id: "model", label: "Modeling / experimentation", automation: 50, judgment: 80, interpersonal: 25, regulatory: 10 },
      { id: "stake", label: "Stakeholder storytelling", automation: 20, judgment: 70, interpersonal: 85, regulatory: 10 },
    ],
    trades: [
      { id: "field", label: "On-site physical work", automation: 10, judgment: 70, interpersonal: 40, regulatory: 50 },
      { id: "diag", label: "Diagnosis / troubleshooting", automation: 25, judgment: 85, interpersonal: 40, regulatory: 40 },
      { id: "safety", label: "Safety and code compliance", automation: 20, judgment: 75, interpersonal: 30, regulatory: 90 },
      { id: "quote", label: "Estimates and client communication", automation: 30, judgment: 60, interpersonal: 80, regulatory: 20 },
    ],
    operations_clerical: [
      { id: "entry", label: "Data entry / filing", automation: 90, judgment: 15, interpersonal: 15, regulatory: 20 },
      { id: "sched", label: "Scheduling / coordination", automation: 55, judgment: 45, interpersonal: 70, regulatory: 15 },
      { id: "customer", label: "Customer handling", automation: 35, judgment: 60, interpersonal: 90, regulatory: 20 },
      { id: "report", label: "Routine reporting", automation: 75, judgment: 30, interpersonal: 25, regulatory: 25 },
    ],
    sales_marketing: [
      { id: "outreach", label: "Outreach / campaigns", automation: 55, judgment: 40, interpersonal: 70, regulatory: 10 },
      { id: "close", label: "Negotiation / closing", automation: 20, judgment: 80, interpersonal: 95, regulatory: 15 },
      { id: "content", label: "Content production", automation: 60, judgment: 50, interpersonal: 30, regulatory: 5 },
      { id: "insight", label: "Market insight", automation: 35, judgment: 75, interpersonal: 40, regulatory: 5 },
    ],
    management: [
      { id: "people", label: "People leadership", automation: 15, judgment: 85, interpersonal: 95, regulatory: 30 },
      { id: "priority", label: "Prioritization / strategy", automation: 25, judgment: 90, interpersonal: 70, regulatory: 20 },
      { id: "report", label: "Status reporting", automation: 55, judgment: 40, interpersonal: 50, regulatory: 15 },
    ],
    generic: [
      { id: "core", label: "Core role duties", automation: 45, judgment: 55, interpersonal: 40, regulatory: 25 },
      { id: "coord", label: "Coordination", automation: 40, judgment: 50, interpersonal: 65, regulatory: 15 },
      { id: "docs", label: "Documentation", automation: 60, judgment: 35, interpersonal: 20, regulatory: 20 },
    ],
  };

  let tasks = [...(base[family] || base.generic)];

  if (family === "software_engineering" && spec === "devops") {
    tasks = [
      { id: "infra", label: "Infrastructure as code", automation: 50, judgment: 65, interpersonal: 25, regulatory: 20 },
      { id: "ci", label: "CI/CD pipelines", automation: 55, judgment: 55, interpersonal: 30, regulatory: 15 },
      { id: "incident", label: "On-call / incidents", automation: 30, judgment: 85, interpersonal: 50, regulatory: 25 },
      { id: "sec", label: "Security hardening", automation: 35, judgment: 80, interpersonal: 35, regulatory: 40 },
    ];
  }
  if (family === "software_engineering" && spec === "full_stack") {
    tasks = [
      { id: "fe", label: "UI feature delivery", automation: 65, judgment: 45, interpersonal: 25, regulatory: 5 },
      { id: "be", label: "API / service implementation", automation: 60, judgment: 55, interpersonal: 25, regulatory: 10 },
      { id: "design", label: "End-to-end design tradeoffs", automation: 35, judgment: 80, interpersonal: 40, regulatory: 10 },
      { id: "review", label: "Cross-stack code review", automation: 30, judgment: 75, interpersonal: 55, regulatory: 10 },
    ];
  }
  return tasks;
}

/* ------------------------------------------------------------------ */
/* Locale-aware growth skills                                          */
/* ------------------------------------------------------------------ */

const FAMILY_GROWTH_SKILLS: Record<RoleFamily, LocaleTable<string[]>> = {
  software_engineering: {
    en: ["System design", "AI-assisted development workflows", "Observability", "Domain modeling", "Technical writing"],
    fa: ["طراحی سیستم", "جریان‌های کاری با کمک AI", "قابلیت مشاهده‌پذیری", "مدل‌سازی دامنه", "نوشتن فنی"],
    ar: ["تصميم الأنظمة", "سير عمل بمساعدة الذكاء الاصطناعي", "المراقبة", "نمذجة المجال", "الكتابة التقنية"],
    es: ["Diseño de sistemas", "Flujos asistidos por IA", "Observabilidad", "Modelado de dominio", "Escritura técnica"],
    fr: ["Conception système", "Flux assistés par IA", "Observabilité", "Modélisation métier", "Rédaction technique"],
    de: ["Systemdesign", "KI-gestützte Workflows", "Observability", "Domain-Modellierung", "Technisches Schreiben"],
    hi: ["सिस्टम डिज़ाइन", "AI-सहायित वर्कफ़्लो", "ऑब्ज़र्वेबिलिटी", "डोमेन मॉडलिंग", "तकनीकी लेखन"],
  },
  accounting_finance: {
    en: ["AI-assisted reporting automation", "Controls and exception handling", "Stakeholder advisory storytelling", "FP&A scenario modeling", "Data literacy (SQL/BI)"],
    fa: ["گزارش‌دهی خودکار با کمک AI", "کنترل و مدیریت استثنا", "روایت‌گری مشاوره‌ای برای ذی‌نفعان", "مدل‌سازی سناریوی FP&A", "سواد داده (SQL/BI)"],
    ar: ["أتمتة التقارير بمساعدة الذكاء الاصطناعي", "الرقابة ومعالجة الاستثناءات", "سرد المشورة لأصحاب المصلحة", "نمذجة سيناريوهات FP&A", "محو الأمية البياناتية (SQL/BI)"],
    es: ["Automatización de reporting asistida por IA", "Controles y manejo de excepciones", "Storytelling de asesoría a stakeholders", "Modelado de escenarios FP&A", "Alfabetización de datos (SQL/BI)"],
    fr: ["Automatisation du reporting assistée par IA", "Contrôles et gestion des exceptions", "Storytelling de conseil aux parties prenantes", "Modélisation de scénarios FP&A", "Littératie des données (SQL/BI)"],
    de: ["KI-gestützte Reporting-Automatisierung", "Controls und Ausnahmebehandlung", "Stakeholder-Beratungs-Storytelling", "FP&A-Szenario-Modellierung", "Datenkompetenz (SQL/BI)"],
    hi: ["AI-सहायित रिपोर्टिंग स्वचालन", "नियंत्रण और अपवाद प्रबंधन", "हितधारक सलाहकार स्टोरीटेलिंग", "FP&A परिदृश्य मॉडलिंग", "डेटा साक्षरता (SQL/BI)"],
  },
  education: {
    en: ["Differentiated instruction design", "Assessment literacy", "EdTech facilitation", "Parent/stakeholder communication", "Classroom analytics basics"],
    fa: ["طراحی آموزش متمایز", "سواد سنجش", "تسهیل‌گری EdTech", "ارتباط با والدین و ذی‌نفعان", "مبانی تحلیل کلاس"],
    ar: ["تصميم التعليم المتمايز", "ثقافة التقييم", "تيسير تقنيات التعليم", "التواصل مع الوالدين وأصحاب المصلحة", "أساسيات تحليلات الفصل"],
    es: ["Diseño de instrucción diferenciada", "Alfabetización en evaluación", "Facilitación EdTech", "Comunicación con familias y stakeholders", "Analítica básica de aula"],
    fr: ["Conception pédagogique différenciée", "Littératie d'évaluation", "Facilitation EdTech", "Communication familles et parties prenantes", "Analytique de classe (bases)"],
    de: ["Differenziertes Unterrichtsdesign", "Assessment-Kompetenz", "EdTech-Moderation", "Eltern-/Stakeholder-Kommunikation", "Grundlagen Klassenraum-Analytik"],
    hi: ["विभेदित शिक्षण डिज़ाइन", "मूल्यांकन साक्षरता", "EdTech सुविधा", "अभिभावक/हितधारक संचार", "कक्षा विश्लेषण मूल बातें"],
  },
  healthcare: {
    en: ["Clinical documentation quality", "Interdisciplinary coordination", "Patient education", "Protocol exception judgment", "Digital health literacy"],
    fa: ["کیفیت مستندسازی بالینی", "هماهنگی بین‌رشته‌ای", "آموزش بیمار", "قضاوت در استثناهای پروتکل", "سواد سلامت دیجیتال"],
    ar: ["جودة التوثيق السريري", "التنسيق بين التخصصات", "تعليم المريض", "الحكم في استثناءات البروتوكول", "محو الأمية الصحية الرقمية"],
    es: ["Calidad de documentación clínica", "Coordinación interdisciplinaria", "Educación del paciente", "Juicio en excepciones de protocolo", "Alfabetización en salud digital"],
    fr: ["Qualité de documentation clinique", "Coordination interdisciplinaire", "Éducation patient", "Jugement sur exceptions de protocole", "Littératie santé numérique"],
    de: ["Qualität der klinischen Dokumentation", "Interdisziplinäre Koordination", "Patientenschulung", "Protokoll-Ausnahmeurteil", "Digitale Gesundheitskompetenz"],
    hi: ["क्लिनिकल दस्तावेज़ीकरण गुणवत्ता", "अंतर-विषय समन्वय", "रोगी शिक्षा", "प्रोटोकॉल अपवाद निर्णय", "डिजिटल स्वास्थ्य साक्षरता"],
  },
  design: {
    en: ["UX research synthesis", "Design systems", "Prototyping in Figma", "Accessibility", "Stakeholder critique facilitation"],
    fa: ["ترکیب پژوهش UX", "سیستم‌های طراحی", "نمونه‌سازی در فیگما", "دسترس‌پذیری", "تسهیل نقد ذی‌نفعان"],
    ar: ["تركيب أبحاث UX", "أنظمة التصميم", "النماذج الأولية في Figma", "إمكانية الوصول", "تيسير نقد أصحاب المصلحة"],
    es: ["Síntesis de investigación UX", "Sistemas de diseño", "Prototipado en Figma", "Accesibilidad", "Facilitación de crítica con stakeholders"],
    fr: ["Synthèse de recherche UX", "Design systems", "Prototypage dans Figma", "Accessibilité", "Facilitation de critique parties prenantes"],
    de: ["UX-Research-Synthese", "Design-Systems", "Prototyping in Figma", "Barrierefreiheit", "Stakeholder-Kritik-Moderation"],
    hi: ["UX रिसर्च संश्लेषण", "डिज़ाइन सिस्टम", "Figma में प्रोटोटाइपिंग", "सुलभता", "हितधारक समीक्षा सुविधा"],
  },
  data: {
    en: ["Experiment design", "Data storytelling", "Pipeline reliability", "SQL/analytics depth", "Model monitoring"],
    fa: ["طراحی آزمایش", "روایت‌گری داده", "قابلیت اطمینان پایپ‌لاین", "تسلط بر SQL/تحلیل", "پایش مدل"],
    ar: ["تصميم التجارب", "سرد البيانات", "موثوقية خطوط الأنابيب", "عمق SQL/التحليلات", "مراقبة النموذج"],
    es: ["Diseño de experimentos", "Storytelling de datos", "Fiabilidad de pipelines", "Profundidad SQL/analítica", "Monitoreo de modelos"],
    fr: ["Conception d'expériences", "Storytelling de données", "Fiabilité des pipelines", "Maîtrise SQL/analytique", "Suivi des modèles"],
    de: ["Experimentdesign", "Data Storytelling", "Pipeline-Zuverlässigkeit", "SQL-/Analyse-Tiefe", "Modell-Monitoring"],
    hi: ["प्रयोग डिज़ाइन", "डेटा स्टोरीटेलिंग", "पाइपलाइन विश्वसनीयता", "SQL/एनालिटिक्स गहराई", "मॉडल निगरानी"],
  },
  trades: {
    en: ["Diagnostics methodology", "Safety and code updates", "Digital quoting/CRM", "Customer communication", "Specialty certifications"],
    fa: ["روش‌شناسی عیب‌یابی", "به‌روزرسانی ایمنی و مقررات", "پیشنهاد قیمت دیجیتال / CRM", "ارتباط با مشتری", "گواهی‌های تخصصی"],
    ar: ["منهجية التشخيص", "تحديثات السلامة والكود", "التسعير الرقمي / CRM", "التواصل مع العميل", "شهادات متخصصة"],
    es: ["Metodología de diagnóstico", "Actualizaciones de seguridad y código", "Presupuestos digitales/CRM", "Comunicación con cliente", "Certificaciones especializadas"],
    fr: ["Méthodologie de diagnostic", "Mises à jour sécurité et code", "Devis numérique/CRM", "Communication client", "Certifications spécialisées"],
    de: ["Diagnose-Methodik", "Sicherheits- und Code-Updates", "Digitales Angebot/CRM", "Kundenkommunikation", "Spezialzertifizierungen"],
    hi: ["डायग्नोस्टिक्स पद्धति", "सुरक्षा और कोड अपडेट", "डिजिटल कोटिंग/CRM", "ग्राहक संचार", "विशेष प्रमाणन"],
  },
  operations_clerical: {
    en: ["Process exception handling", "No-code workflow automation", "Customer escalation judgment", "Spreadsheet/BI literacy", "Cross-team coordination"],
    fa: ["مدیریت استثنای فرایند", "اتوماسیون جریان‌کار بدون کد", "قضاوت در ارجاع مشتری", "سواد صفحه‌گسترده / BI", "هماهنگی بین‌تیمی"],
    ar: ["معالجة استثناءات العمليات", "أتمتة سير العمل بدون كود", "الحكم في تصعيد العملاء", "محو الأمية في الجداول / BI", "التنسيق بين الفرق"],
    es: ["Manejo de excepciones de proceso", "Automatización de flujos no-code", "Juicio de escalado de cliente", "Alfabetización hoja de cálculo/BI", "Coordinación transversal"],
    fr: ["Gestion des exceptions de processus", "Automatisation des flux no-code", "Jugement d'escalade client", "Littératie tableur/BI", "Coordination transverse"],
    de: ["Prozess-Ausnahmebehandlung", "No-Code-Workflow-Automatisierung", "Kunden-Eskalations-Urteil", "Tabellen-/BI-Kompetenz", "Teamübergreifende Koordination"],
    hi: ["प्रक्रिया अपवाद प्रबंधन", "नो-कोड वर्कफ़्लो स्वचालन", "ग्राहक एस्केलेशन निर्णय", "स्प्रेडशीट/BI साक्षरता", "क्रॉस-टीम समन्वय"],
  },
  sales_marketing: {
    en: ["Consultative selling", "CRM discipline", "Content differentiation", "Pipeline analytics", "Negotiation"],
    fa: ["فروش مشاوره‌ای", "نظم CRM", "تمایز محتوا", "تحلیل قیف فروش", "مذاکره"],
    ar: ["البيع الاستشاري", "انضباط CRM", "تمييز المحتوى", "تحليلات خط الأنابيب", "التفاوض"],
    es: ["Venta consultiva", "Disciplina CRM", "Diferenciación de contenido", "Analítica de pipeline", "Negociación"],
    fr: ["Vente consultative", "Discipline CRM", "Différenciation de contenu", "Analytique pipeline", "Négociation"],
    de: ["Beratender Verkauf", "CRM-Disziplin", "Content-Differenzierung", "Pipeline-Analytik", "Verhandlung"],
    hi: ["परामर्शात्मक बिक्री", "CRM अनुशासन", "कंटेंट विभेदन", "पाइपलाइन एनालिटिक्स", "बातचीत"],
  },
  management: {
    en: ["Coaching conversations", "Prioritization frameworks", "Cross-functional influence", "Hiring signal design", "Operational metrics"],
    fa: ["گفتگوهای کوچینگ", "چارچوب‌های اولویت‌بندی", "نفوذ بین‌تیمی", "طراحی سیگنال استخدام", "معیارهای عملیاتی"],
    ar: ["محادثات التدريب", "أطر تحديد الأولويات", "التأثير عبر الوظائف", "تصميم إشارات التوظيف", "المقاييس التشغيلية"],
    es: ["Conversaciones de coaching", "Marcos de priorización", "Influencia transversal", "Diseño de señales de contratación", "Métricas operativas"],
    fr: ["Conversations de coaching", "Cadres de priorisation", "Influence transverse", "Conception de signaux de recrutement", "Métriques opérationnelles"],
    de: ["Coaching-Gespräche", "Priorisierungs-Frameworks", "Funktionsübergreifender Einfluss", "Hiring-Signal-Design", "Operative Metriken"],
    hi: ["कोचिंग बातचीत", "प्राथमिकता फ्रेमवर्क", "क्रॉस-फंक्शनल प्रभाव", "हायरिंग सिग्नल डिज़ाइन", "ऑपरेशनल मेट्रिक्स"],
  },
  generic: {
    en: ["Domain specialization", "Digital literacy", "Structured problem solving", "Professional communication", "Portfolio evidence building"],
    fa: ["تخصص حوزه‌ای", "سواد دیجیتال", "حل مسئله ساخت‌یافته", "ارتباط حرفه‌ای", "ساخت شواهد نمونه‌کار"],
    ar: ["التخصص في المجال", "محو الأمية الرقمية", "حل المشكلات المنظم", "التواصل المهني", "بناء أدلة الأعمال"],
    es: ["Especialización de dominio", "Alfabetización digital", "Resolución estructurada de problemas", "Comunicación profesional", "Construcción de evidencia de portafolio"],
    fr: ["Spécialisation métier", "Littératie numérique", "Résolution structurée de problèmes", "Communication professionnelle", "Construction de preuves de portfolio"],
    de: ["Fachspezialisierung", "Digitale Kompetenz", "Strukturierte Problemlösung", "Professionelle Kommunikation", "Portfolio-Nachweise aufbauen"],
    hi: ["डोमेन विशेषज्ञता", "डिजिटल साक्षरता", "संरचित समस्या समाधान", "पेशेवर संचार", "पोर्टफोलियो प्रमाण निर्माण"],
  },
};

const SPEC_GROWTH: Partial<Record<string, LocaleTable<string[]>>> = {
  frontend: {
    en: ["Accessibility", "Design systems collaboration", "Web performance"],
    fa: ["دسترس‌پذیری", "همکاری در سیستم‌های طراحی", "کارایی وب"],
    ar: ["إمكانية الوصول", "التعاون في أنظمة التصميم", "أداء الويب"],
    es: ["Accesibilidad", "Colaboración en sistemas de diseño", "Rendimiento web"],
    fr: ["Accessibilité", "Collaboration design systems", "Performance web"],
    de: ["Barrierefreiheit", "Design-Systems-Zusammenarbeit", "Web-Performance"],
    hi: ["सुलभता", "डिज़ाइन सिस्टम सहयोग", "वेब प्रदर्शन"],
  },
  backend: {
    en: ["API reliability", "Data modeling", "Observability"],
    fa: ["قابلیت اطمینان API", "مدل‌سازی داده", "قابلیت مشاهده‌پذیری"],
    ar: ["موثوقية API", "نمذجة البيانات", "المراقبة"],
    es: ["Fiabilidad de API", "Modelado de datos", "Observabilidad"],
    fr: ["Fiabilité API", "Modélisation de données", "Observabilité"],
    de: ["API-Zuverlässigkeit", "Datenmodellierung", "Observability"],
    hi: ["API विश्वसनीयता", "डेटा मॉडलिंग", "ऑब्ज़र्वेबिलिटी"],
  },
  full_stack: {
    en: ["End-to-end ownership", "System design", "Product sense"],
    fa: ["مالکیت سرتاسری", "طراحی سیستم", "درک محصول"],
    ar: ["الملكية الشاملة", "تصميم الأنظمة", "حس المنتج"],
    es: ["Ownership end-to-end", "Diseño de sistemas", "Sentido de producto"],
    fr: ["Ownership de bout en bout", "Conception système", "Sens produit"],
    de: ["End-to-End-Ownership", "Systemdesign", "Produktsinn"],
    hi: ["एंड-टू-एंड ओनरशिप", "सिस्टम डिज़ाइन", "उत्पाद बोध"],
  },
  devops: {
    en: ["Infrastructure as code", "Incident response", "Security hardening"],
    fa: ["زیرساخت به‌صورت کد", "واکنش به حادثه", "سخت‌سازی امنیتی"],
    ar: ["البنية التحتية كشيفرة", "الاستجابة للحوادث", "تقوية الأمان"],
    es: ["Infraestructura como código", "Respuesta a incidentes", "Endurecimiento de seguridad"],
    fr: ["Infrastructure as code", "Réponse aux incidents", "Renforcement sécurité"],
    de: ["Infrastructure as Code", "Incident Response", "Security-Hardening"],
    hi: ["इन्फ़्रास्ट्रक्चर ऐज़ कोड", "घटना प्रतिक्रिया", "सुरक्षा सख़्ती"],
  },
  ai_ml: {
    en: ["Python for ML", "Experiment tracking", "Model evaluation"],
    fa: ["پایتون برای ML", "ردیابی آزمایش", "ارزیابی مدل"],
    ar: ["Python للتعلم الآلي", "تتبع التجارب", "تقييم النموذج"],
    es: ["Python para ML", "Seguimiento de experimentos", "Evaluación de modelos"],
    fr: ["Python pour ML", "Suivi d'expériences", "Évaluation de modèles"],
    de: ["Python für ML", "Experiment-Tracking", "Modell-Evaluierung"],
    hi: ["ML के लिए Python", "प्रयोग ट्रैकिंग", "मॉडल मूल्यांकन"],
  },
  data_engineering: {
    en: ["Pipeline reliability", "SQL depth", "Data quality tests"],
    fa: ["قابلیت اطمینان پایپ‌لاین", "تسلط بر SQL", "تست‌های کیفیت داده"],
    ar: ["موثوقية خطوط الأنابيب", "عمق SQL", "اختبارات جودة البيانات"],
    es: ["Fiabilidad de pipelines", "Profundidad SQL", "Pruebas de calidad de datos"],
    fr: ["Fiabilité des pipelines", "Maîtrise SQL", "Tests de qualité des données"],
    de: ["Pipeline-Zuverlässigkeit", "SQL-Tiefe", "Datenqualitätstests"],
    hi: ["पाइपलाइन विश्वसनीयता", "SQL गहराई", "डेटा गुणवत्ता परीक्षण"],
  },
  ux_ui: {
    en: ["User research synthesis", "Interaction design", "Accessibility"],
    fa: ["ترکیب پژوهش کاربر", "طراحی تعامل", "دسترس‌پذیری"],
    ar: ["تركيب أبحاث المستخدم", "تصميم التفاعل", "إمكانية الوصول"],
    es: ["Síntesis de investigación de usuarios", "Diseño de interacción", "Accesibilidad"],
    fr: ["Synthèse recherche utilisateur", "Design d'interaction", "Accessibilité"],
    de: ["User-Research-Synthese", "Interaction Design", "Barrierefreiheit"],
    hi: ["उपयोगकर्ता रिसर्च संश्लेषण", "इंटरैक्शन डिज़ाइन", "सुलभता"],
  },
  tax: {
    en: ["Tax research depth", "Advisory communication", "Automation of routine filings"],
    fa: ["عمق پژوهش مالیاتی", "ارتباط مشاوره‌ای", "اتوماسیون اظهارنامه‌های روتین"],
    ar: ["عمق البحث الضريبي", "التواصل الاستشاري", "أتمتة الإقرارات الروتينية"],
    es: ["Profundidad en investigación fiscal", "Comunicación de asesoría", "Automatización de declaraciones rutinarias"],
    fr: ["Profondeur de recherche fiscale", "Communication de conseil", "Automatisation des déclarations courantes"],
    de: ["Steuerrecherche-Tiefe", "Beratungskommunikation", "Automatisierung routinemäßiger Erklärungen"],
    hi: ["कर अनुसंधान गहराई", "सलाहकार संचार", "नियमित फाइलिंग का स्वचालन"],
  },
  audit: {
    en: ["Controls design", "Exception investigation", "Stakeholder reporting"],
    fa: ["طراحی کنترل‌ها", "بررسی استثناها", "گزارش‌دهی به ذی‌نفعان"],
    ar: ["تصميم الضوابط", "التحقيق في الاستثناءات", "التقارير لأصحاب المصلحة"],
    es: ["Diseño de controles", "Investigación de excepciones", "Reporte a stakeholders"],
    fr: ["Conception des contrôles", "Investigation des exceptions", "Reporting parties prenantes"],
    de: ["Controls-Design", "Ausnahmeuntersuchung", "Stakeholder-Reporting"],
    hi: ["नियंत्रण डिज़ाइन", "अपवाद जाँच", "हितधारक रिपोर्टिंग"],
  },
  primary: {
    en: ["Differentiated instruction", "Classroom analytics", "Parent communication"],
    fa: ["آموزش متمایز", "تحلیل کلاس", "ارتباط با والدین"],
    ar: ["التعليم المتمايز", "تحليلات الفصل", "التواصل مع الوالدين"],
    es: ["Instrucción diferenciada", "Analítica de aula", "Comunicación con familias"],
    fr: ["Pédagogie différenciée", "Analytique de classe", "Communication parents"],
    de: ["Differenzierter Unterricht", "Klassenraum-Analytik", "Elternkommunikation"],
    hi: ["विभेदित शिक्षण", "कक्षा विश्लेषण", "अभिभावक संचार"],
  },
  edtech: {
    en: ["Learning product design", "Content systems", "Facilitation online"],
    fa: ["طراحی محصول یادگیری", "سیستم‌های محتوا", "تسهیل آنلاین"],
    ar: ["تصميم منتجات التعلم", "أنظمة المحتوى", "التيسير عبر الإنترنت"],
    es: ["Diseño de producto de aprendizaje", "Sistemas de contenido", "Facilitación en línea"],
    fr: ["Conception de produit d'apprentissage", "Systèmes de contenu", "Facilitation en ligne"],
    de: ["Lernprodukt-Design", "Content-Systeme", "Online-Moderation"],
    hi: ["लर्निंग उत्पाद डिज़ाइन", "कंटेंट सिस्टम", "ऑनलाइन सुविधा"],
  },
};

function computeSkillGaps(
  currentSkills: string[],
  currentFamily: RoleFamily,
  targetFamily: RoleFamily | null,
  targetSpec: string | null,
  currentSpec: string | null,
  locale: CareerRiskLocale,
): string[] {
  const have = new Set(currentSkills.map(canonicalSkill));
  const family = targetFamily || currentFamily;
  const spec = targetSpec || currentSpec;

  const specList: string[] = spec && SPEC_GROWTH[spec]
    ? L(locale, SPEC_GROWTH[spec] as LocaleTable<string[]>)
    : [];
  const familyList: string[] = L(locale, FAMILY_GROWTH_SKILLS[family]);

  const growth = [
    ...specList,
    ...familyList.filter((g) => !specList.includes(g)),
  ];

  return growth.filter((g) => !have.has(canonicalSkill(g)));
}

function tasksFromResponsibilities(raw?: string | null): TaskExposure[] {
  if (!raw?.trim()) return [];
  const lines = raw
    .split(/[\n;•\-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8)
    .slice(0, 12);
  const out: TaskExposure[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = norm(line);
    let automation = 40;
    let judgment = 50;
    let interpersonal = 40;
    let regulatory = 20;
    if (
      /report|repetitive|data entry|گزارش تکراری|ورود داده|copy.?paste/.test(n)
    ) {
      automation = 85;
      judgment = 20;
    }
    if (/architect|design system|طراحی معماری|system design/.test(n)) {
      automation = 30;
      judgment = 85;
    }
    if (/code review|review|بازبینی/.test(n)) {
      automation = 35;
      judgment = 75;
      interpersonal = 60;
    }
    if (/manage|leadership|team|مدیریت|رهبری|mentoring/.test(n)) {
      automation = 20;
      judgment = 80;
      interpersonal = 90;
    }
    if (/client|stakeholder|parent|بیمار|مذاکره|customer/.test(n)) {
      interpersonal = 90;
      judgment = 70;
      automation = 25;
    }
    if (/compliance|safety|protocol|regulatory|مقررات/.test(n)) {
      regulatory = 85;
      judgment = 75;
      automation = 30;
    }
    if (/performance|optim|بهینه/.test(n)) {
      judgment = 70;
      automation = 40;
    }
    out.push({
      id: `resp_${i}`,
      label: line.slice(0, 120),
      automation,
      judgment,
      interpersonal,
      regulatory,
    });
  }
  return out;
}

export function buildCareerProfile(input: ProfileInput): CareerProfile {
  const locale = normalizeCareerLocale(input.locale);
  const currentRole = (input.jobTitle || "").trim().slice(0, 120);
  const skills = splitList(input.skills);
  const industry = input.industry?.trim() || null;
  const education = input.education?.trim() || null;
  const country = input.country?.trim() || null;
  const location = input.location?.trim() || null;
  const targetRole = input.targetRole?.trim().slice(0, 120) || null;
  const careerGoal = input.careerGoal?.trim().slice(0, 200) || null;
  const languages = splitList(input.languages);
  const years =
    typeof input.experienceYears === "number" &&
    Number.isFinite(input.experienceYears)
      ? input.experienceYears
      : null;

  const uncertainty: string[] = [];
  if (!currentRole) uncertainty.push("missing_role");
  if (skills.length === 0) uncertainty.push("missing_skills");
  if (years == null) uncertainty.push("missing_experience");
  if (!industry) uncertainty.push("missing_industry");
  if (!education) uncertainty.push("missing_education");
  if (!country && !location) uncertainty.push("missing_location");
  if (!targetRole) uncertainty.push("missing_target_role");
  if (languages.length === 0)
    uncertainty.push("missing_language_proficiency");

  const roleFamily = detectFamily(currentRole, skills, industry || "");
  const specialization = detectSpecialization(
    roleFamily,
    currentRole,
    skills,
  );
  const seniority = detectSeniority(currentRole, years);
  const familyTasks = tasksForFamily(roleFamily, specialization);
  const respTasks = tasksFromResponsibilities(input.responsibilities);
  const tasks =
    respTasks.length > 0
      ? [
          ...respTasks,
          ...familyTasks.filter(
            (ft) => !respTasks.some((r) => r.id === ft.id),
          ),
        ].slice(0, 10)
      : familyTasks;

  const responsibilityLines = respTasks.map((t) => t.label);
  if (responsibilityLines.length === 0 && input.responsibilities?.trim()) {
    uncertainty.push("responsibilities_unparsed");
  } else if (!input.responsibilities?.trim()) {
    uncertainty.push("missing_responsibilities");
  }

  const classified = classifySkills(skills);

  const targetRoleFamily = targetRole
    ? detectFamily(targetRole, [], industry || "")
    : null;
  const targetSpecialization = targetRole
    ? detectSpecialization(
        targetRoleFamily || "generic",
        `${targetRole} ${careerGoal || ""}`.trim(),
        [],
      )
    : null;

  const missingSkills = computeSkillGaps(
    skills,
    roleFamily,
    targetRoleFamily,
    targetSpecialization,
    specialization,
    locale,
  ).slice(0, 8);

  const transferableSkills = Array.from(
    new Set([
      ...classified.technicalSkills.slice(0, 6),
      ...classified.tools.slice(0, 3),
      ...tasks.filter((t) => t.judgment >= 70).map((t) => t.label),
    ]),
  ).slice(0, 10);

  let completeness = 15;
  if (currentRole) completeness += 15;
  if (skills.length >= 3) completeness += 15;
  else if (skills.length > 0) completeness += 8;
  if (years != null) completeness += 12;
  if (industry) completeness += 8;
  if (education) completeness += 8;
  if (country || location) completeness += 5;
  if (targetRole) completeness += 12;
  if (languages.length > 0) completeness += 5;
  if (careerGoal) completeness += 5;
  completeness = Math.min(100, completeness);

  return {
    currentRole: currentRole || "Professional",
    normalizedRole: norm(currentRole) || "professional",
    roleFamily,
    specialization,
    seniority,
    yearsExperience: years,
    industry,
    education,
    skills,
    technicalSkills: classified.technicalSkills,
    softSkills: classified.softSkills,
    tools: classified.tools,
    technologies: classified.technologies,
    country,
    location,
    locale,
    languages,
    targetRole,
    targetRoleFamily,
    targetSpecialization,
    careerGoal,
    responsibilities: responsibilityLines || [],
    tasks,
    transferableSkills,
    missingSkills,
    profileCompleteness: completeness,
    uncertainty,
  };
}

export function taskAutomationExposure(profile: CareerProfile): number {
  if (profile.tasks.length === 0) return 45;
  const avg =
    profile.tasks.reduce((s, t) => s + t.automation, 0) / profile.tasks.length;
  return Math.round(avg);
}

export function humanMoatScore(profile: CareerProfile): number {
  if (profile.tasks.length === 0) return 50;
  const avg =
    profile.tasks.reduce(
      (s, t) => s + (t.judgment + t.interpersonal + t.regulatory) / 3,
      0,
    ) / profile.tasks.length;
  let moat = avg;
  if (profile.seniority === "senior" || profile.seniority === "lead") moat += 5;
  if (profile.seniority === "manager") moat += 8;
  const y = profile.yearsExperience ?? 0;
  if (y >= 12) moat += 8;
  else if (y >= 8) moat += 5;
  else if (y >= 5) moat += 3;
  else if (y > 0 && y < 2) moat -= 3;
  return Math.max(0, Math.min(100, Math.round(moat)));
}

export function highAutomationTasks(profile: CareerProfile): TaskExposure[] {
  return profile.tasks.filter((t) => t.automation >= 65);
}

export function resilientTasks(profile: CareerProfile): TaskExposure[] {
  return profile.tasks.filter(
    (t) => t.judgment >= 70 || t.interpersonal >= 75 || t.regulatory >= 70,
  );
}

/**
 * Complete 7-locale task label map for every task id used in tasksForFamily.
 * If a task id is not found, fall back to the English label — never null.
 */
const TASK_LABEL_I18N: Record<
  string,
  Partial<Record<CareerRiskLocale, string>>
> = {
  // software_engineering
  impl: { fa: "پیاده‌سازی قابلیت / کدنویسی", ar: "تنفيذ الميزات / البرمجة", es: "Implementación de funciones", fr: "Implémentation de fonctionnalités", de: "Feature-Implementierung", hi: "फीचर इम्प्लीमेंटेशन" },
  boilerplate: { fa: "کارهای تکراری و CRUD", ar: "أعمال متكررة و CRUD", es: "Trabajo repetitivo y CRUD", fr: "Tâches répétitives et CRUD", de: "Boilerplate und CRUD", hi: "दोहराव और CRUD" },
  reqs: { fa: "روشن‌سازی نیازمندی‌ها", ar: "توضيح المتطلبات", es: "Aclaración de requisitos", fr: "Clarification des exigences", de: "Anforderungsklärung", hi: "आवश्यकताएँ स्पष्ट करना" },
  infra: { fa: "زیرساخت به‌صورت کد", ar: "البنية التحتية كشيفرة", es: "Infraestructura como código", fr: "Infrastructure as code", de: "Infrastructure as Code", hi: "इन्फ़्रास्ट्रक्चर ऐज़ कोड" },
  ci: { fa: "پایپ‌لاین CI/CD", ar: "خطوط CI/CD", es: "Pipelines CI/CD", fr: "Pipelines CI/CD", de: "CI/CD-Pipelines", hi: "CI/CD पाइपलाइन" },
  sec: { fa: "سخت‌سازی امنیتی", ar: "تقوية الأمان", es: "Endurecimiento de seguridad", fr: "Renforcement sécurité", de: "Security-Hardening", hi: "सुरक्षा सख़्ती" },
  fe: { fa: "تحویل قابلیت UI", ar: "تسليم ميزات الواجهة", es: "Entrega de funciones UI", fr: "Livraison de fonctionnalités UI", de: "UI-Feature-Lieferung", hi: "UI फ़ीचर डिलीवरी" },
  be: { fa: "پیاده‌سازی API / سرویس", ar: "تنفيذ API / الخدمة", es: "Implementación de API/servicio", fr: "Implémentation API/service", de: "API-/Service-Implementierung", hi: "API / सेवा इम्प्लीमेंटेशन" },
  // accounting_finance
  entry: { fa: "ورود داده / فاکتور", ar: "إدخال بيانات / فواتير", es: "Entrada de datos / facturas", fr: "Saisie de données / factures", de: "Dateneingabe / Rechnungen", hi: "डेटा एंट्री / इनवॉइस" },
  recon: { fa: "مغایرت‌گیری", ar: "المطابقة", es: "Conciliación", fr: "Rapprochement", de: "Abstimmung", hi: "सुलह" },
  report: { fa: "بسته گزارش مالی", ar: "حزم التقارير المالية", es: "Paquetes de reporting financiero", fr: "Reporting financier", de: "Finanzreporting", hi: "वित्तीय रिपोर्टिंग" },
  tax: { fa: "تفسیر مالیات", ar: "تفسير الضرائب", es: "Interpretación fiscal", fr: "Interprétation fiscale", de: "Steuerauslegung", hi: "कर व्याख्या" },
  advise: { fa: "مشاوره به مشتری / ذی‌نفع", ar: "استشارة العميل / صاحب المصلحة", es: "Asesoría a cliente / stakeholder", fr: "Conseil client / partie prenante", de: "Kunden-/Stakeholder-Beratung", hi: "ग्राहक / हितधारक सलाह" },
  control: { fa: "کنترل و مدیریت استثنا", ar: "الرقابة ومعالجة الاستثناءات", es: "Controles y manejo de excepciones", fr: "Contrôles et exceptions", de: "Controls und Ausnahmen", hi: "नियंत्रण और अपवाद" },
  // education
  lesson: { fa: "تدریس و تسهیل کلاس", ar: "تقديم الدروس", es: "Impartición de clases", fr: "Animation de cours", de: "Unterrichtsführung", hi: "पाठ वितरण" },
  plan: { fa: "برنامه‌ریزی درس", ar: "تخطيط الدرس", es: "Planificación de clases", fr: "Planification des cours", de: "Unterrichtsplanung", hi: "पाठ योजना" },
  assess: { fa: "ارزشیابی و بازخورد", ar: "التقييم والتغذية الراجعة", es: "Evaluación y feedback", fr: "Évaluation et retour", de: "Bewertung und Feedback", hi: "मूल्यांकन और प्रतिक्रिया" },
  admin: { fa: "امور اداری / حضور و غیاب / گزارش", ar: "الإدارة / الحضور / التقارير", es: "Admin / asistencia / reportes", fr: "Admin / présence / rapports", de: "Verwaltung / Anwesenheit / Berichte", hi: "प्रशासन / उपस्थिति / रिपोर्ट" },
  pastoral: { fa: "ارتباط با والدین و پشتیبانی", ar: "التواصل مع الوالدين والدعم", es: "Comunicación con familias y apoyo", fr: "Communication parents et soutien", de: "Elternkommunikation und Betreuung", hi: "अभिभावक संवाद और सहयोग" },
  diff: { fa: "تفکیک برای یادگیرندگان", ar: "التمايز للمتعلمين", es: "Diferenciación para estudiantes", fr: "Différenciation pédagogique", de: "Differenzierung für Lernende", hi: "शिक्षार्थियों के लिए विभेदन" },
  // healthcare
  hands: { fa: "مراقبت مستقیم از بیمار", ar: "رعاية مباشرة للمريض", es: "Atención directa al paciente", fr: "Soins directs au patient", de: "Direkte Patientenversorgung", hi: "प्रत्यक्ष रोगी देखभाल" },
  doc: { fa: "مستندسازی بالینی", ar: "التوثيق السريري", es: "Documentación clínica", fr: "Documentation clinique", de: "Klinische Dokumentation", hi: "क्लिनिकल दस्तावेज़ीकरण" },
  triage: { fa: "تریاژ / اولویت‌بندی", ar: "الفرز / تحديد الأولويات", es: "Triaje / priorización", fr: "Triage / priorisation", de: "Triage / Priorisierung", hi: "ट्रायाज / प्राथमिकता" },
  coord: { fa: "هماهنگی مراقبت", ar: "تنسيق الرعاية", es: "Coordinación de cuidados", fr: "Coordination des soins", de: "Versorgungskoordination", hi: "देखभाल समन्वय" },
  med: { fa: "دارو / پایبندی به پروتکل", ar: "الدواء / الالتزام بالبروتوكول", es: "Medicación / adherencia al protocolo", fr: "Médication / respect du protocole", de: "Medikation / Protokolltreue", hi: "दवा / प्रोटोकॉल पालन" },
  // design
  produce: { fa: "تولید دارایی بصری", ar: "إنتاج الأصول", es: "Producción de recursos", fr: "Production d'actifs", de: "Asset-Produktion", hi: "एसेट उत्पादन" },
  concept: { fa: "مفهوم / جهت‌گیری خلاقانه", ar: "المفهوم / التوجه الإبداعي", es: "Concepto / dirección creativa", fr: "Concept / direction créative", de: "Konzept / kreative Leitung", hi: "कॉन्सेप्ट / रचनात्मक दिशा" },
  research: { fa: "ترکیب پژوهش کاربر", ar: "تركيب أبحاث المستخدم", es: "Síntesis de investigación", fr: "Synthèse de recherche", de: "Research-Synthese", hi: "रिसर्च संश्लेषण" },
  system: { fa: "سیستم‌های طراحی", ar: "أنظمة التصميم", es: "Sistemas de diseño", fr: "Design systems", de: "Design-Systems", hi: "डिज़ाइन सिस्टम" },
  stake: { fa: "نقد ذی‌نفعان", ar: "نقد أصحاب المصلحة", es: "Crítica con stakeholders", fr: "Critique parties prenantes", de: "Stakeholder-Kritik", hi: "हितधारक समीक्षा" },
  // data
  etl: { fa: "ETL / پایپ‌لاین", ar: "ETL / خطوط الأنابيب", es: "ETL / pipelines", fr: "ETL / pipelines", de: "ETL / Pipelines", hi: "ETL / पाइपलाइन" },
  analysis: { fa: "تحلیل اکتشافی", ar: "التحليل الاستكشافي", es: "Análisis exploratorio", fr: "Analyse exploratoire", de: "Explorative Analyse", hi: "खोजपूर्ण विश्लेषण" },
  model: { fa: "مدل‌سازی / آزمایش", ar: "النمذجة / التجريب", es: "Modelado / experimentación", fr: "Modélisation / expérimentation", de: "Modellierung / Experimente", hi: "मॉडलिंग / प्रयोग" },
  // trades
  field: { fa: "کار فیزیکی در محل", ar: "عمل ميداني", es: "Trabajo físico en sitio", fr: "Travail physique sur site", de: "Körperliche Arbeit vor Ort", hi: "स्थल पर शारीरिक कार्य" },
  diag: { fa: "عیب‌یابی / رفع اشکال", ar: "التشخيص / استكشاف الأخطاء", es: "Diagnóstico / resolución", fr: "Diagnostic / dépannage", de: "Diagnose / Fehlerbehebung", hi: "निदान / समस्या निवारण" },
  safety: { fa: "ایمنی و انطباق با مقررات", ar: "السلامة والامتثال للكود", es: "Seguridad y cumplimiento normativo", fr: "Sécurité et conformité au code", de: "Sicherheit und Code-Compliance", hi: "सुरक्षा और कोड अनुपालन" },
  quote: { fa: "برآورد و ارتباط با مشتری", ar: "التقديرات والتواصل مع العميل", es: "Presupuestos y comunicación", fr: "Devis et communication client", de: "Angebote und Kundenkommunikation", hi: "अनुमान और ग्राहक संवाद" },
  // operations_clerical
  sched: { fa: "زمان‌بندی / هماهنگی", ar: "الجدولة / التنسيق", es: "Programación / coordinación", fr: "Planification / coordination", de: "Terminplanung / Koordination", hi: "शेड्यूलिंग / समन्वय" },
  customer: { fa: "برخورد با مشتری", ar: "التعامل مع العميل", es: "Atención al cliente", fr: "Gestion du client", de: "Kundenbetreuung", hi: "ग्राहक प्रबंधन" },
  // sales_marketing
  outreach: { fa: "کمپین / ارتباط اولیه", ar: "الحملات / التواصل", es: "Campañas / outreach", fr: "Campagnes / prospection", de: "Kampagnen / Outreach", hi: "कैंपेन / आउटरीच" },
  close: { fa: "مذاکره / بستن قرارداد", ar: "التفاوض / الإغلاق", es: "Negociación / cierre", fr: "Négociation / closing", de: "Verhandlung / Abschluss", hi: "बातचीत / क्लोज़िंग" },
  content: { fa: "تولید محتوا", ar: "إنتاج المحتوى", es: "Producción de contenido", fr: "Production de contenu", de: "Content-Produktion", hi: "कंटेंट उत्पादन" },
  insight: { fa: "بینش بازار", ar: "رؤى السوق", es: "Insight de mercado", fr: "Analyse de marché", de: "Markteinblicke", hi: "बाज़ार अंतर्दृष्टि" },
  // management
  people: { fa: "رهبری افراد", ar: "قيادة الأشخاص", es: "Liderazgo de personas", fr: "Leadership d'équipe", de: "Personalführung", hi: "लोगों का नेतृत्व" },
  priority: { fa: "اولویت‌بندی / استراتژی", ar: "تحديد الأولويات / الاستراتيجية", es: "Priorización / estrategia", fr: "Priorisation / stratégie", de: "Priorisierung / Strategie", hi: "प्राथमिकता / रणनीति" },
  // generic
  core: { fa: "وظایف اصلی نقش", ar: "المهام الأساسية للدور", es: "Funciones principales del rol", fr: "Tâches principales du rôle", de: "Kernaufgaben der Rolle", hi: "भूमिका के मुख्य कार्य" },
  docs: { fa: "مستندسازی", ar: "التوثيق", es: "Documentación", fr: "Documentation", de: "Dokumentation", hi: "दस्तावेज़ीकरण" },
};

export function taskLabel(t: TaskExposure, locale?: CareerRiskLocale): string {
  if (locale && locale !== "en") {
    const mapped = TASK_LABEL_I18N[t.id]?.[locale];
    if (mapped) return mapped;
  }
  return t.label;
}

export function toolMaturityFromProfile(profile: CareerProfile): number {
  const n = profile.tools.length + Math.min(3, profile.technologies.length);
  return Math.min(90, 35 + n * 8);
}
