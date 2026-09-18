/**
 * Shared deterministic Career Intelligence Core.
 * Fixes: targetRole pipeline, skill classification, tools vs technical,
 * management/full-stack ordering, skill aliases, experience influence.
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
  /** Spoken/written language abilities — NEVER inferred from UI locale */
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
  /** Explicit language proficiency list — not UI locale */
  languages?: string | null;
  responsibilities?: string | null;
};

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
        .slice(0, 40)
    )
  );
}

/** Canonical skill aliases — Java must NOT map to JavaScript */
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
  ].map(norm)
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
  ].map(norm)
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
  ].map(norm)
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
  ].map(norm)
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
    // Domain / unknown — keep as technical-ish competency, not tool
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
  if (/\b(intern|junior|entry|جونیور|کارآموز|مبتدی)\b/.test(t)) return "junior";
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

/**
 * BUG #8: Management titles classified before operations/clerical.
 * Domain managers (Engineering Manager) still get domain family when clear.
 */
function detectFamily(
  title: string,
  skills: string[],
  industry: string
): RoleFamily {
  const t = norm(title);
  const blob = `${t} ${skills.map(norm).join(" ")} ${norm(industry)}`;

  // Domain-specific manager → domain family (not clerical)
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
      blob
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
    /\b(ai engineer|ml engineer|machine learning|data scien|llm|nlp)\b/.test(blob) ||
    /data engineer|analyst|بیگ دیتا|هوش مصنوعی/.test(blob)
  ) {
    return "data";
  }
  if (
    /devop|sre|backend|frontend|full.?stack|software|developer|engineer|react|node|typescript|python|java|برنامه|نرم.?افزار/.test(
      blob
    )
  ) {
    return "software_engineering";
  }
  if (
    /electric|plumber|welder|hvac|لوله|جوش|برقکار|نجار|trades/.test(blob)
  ) {
    return "trades";
  }
  if (/sales|marketing|بازاریاب|فروش|seo|content/.test(blob)) {
    return "sales_marketing";
  }

  // Pure management keywords (after domain checks)
  if (/\b(manager|director|head of|مدیر)\b/.test(t)) {
    return "management";
  }

  if (/operations|admin|منشی|دفتری|clerical|coordinator|secretary/.test(blob)) {
    return "operations_clerical";
  }
  return "generic";
}

/**
 * BUG #9: full-stack before narrow frontend/backend when dual signals.
 */
function detectSpecialization(
  family: RoleFamily,
  title: string,
  skills: string[]
): string | null {
  const blob = `${norm(title)} ${skills.map(norm).join(" ")}`;

  // Domain keywords from TITLE (and optional skill hints) — not from unrelated current stack
  if (/\b(ai|ml|machine learning|deep learning|llm|data scien|nlp|computer vision|هوش مصنوعی)\b/.test(blob)) {
    return "ai_ml";
  }
  if (/\b(data engineer|etl|analytics engineer)\b/.test(blob)) {
    return "data_engineering";
  }

  if (family === "software_engineering") {
    if (/full.?stack/.test(blob)) return "full_stack";
    const front = hasCanonical(skills, "react", "vue", "angular", "nextjs", "css");
    const back = hasCanonical(
      skills,
      "nodejs",
      "node",
      "java",
      "spring",
      "django",
      "python",
      ".net",
      "golang"
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
  spec: string | null
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

const FAMILY_GROWTH_SKILLS: Record<RoleFamily, string[]> = {
  software_engineering: [
    "System design",
    "AI-assisted development workflows",
    "Observability",
    "Domain modeling",
    "Technical writing",
  ],
  accounting_finance: [
    "AI-assisted reporting automation",
    "Controls and exception handling",
    "Stakeholder advisory storytelling",
    "FP&A scenario modeling",
    "Data literacy (SQL/BI)",
  ],
  education: [
    "Differentiated instruction design",
    "Assessment literacy",
    "EdTech facilitation",
    "Parent/stakeholder communication",
    "Classroom analytics basics",
  ],
  healthcare: [
    "Clinical documentation quality",
    "Interdisciplinary coordination",
    "Patient education",
    "Protocol exception judgment",
    "Digital health literacy",
  ],
  design: [
    "UX research synthesis",
    "Design systems",
    "Prototyping in Figma",
    "Accessibility",
    "Stakeholder critique facilitation",
  ],
  data: [
    "Experiment design",
    "Data storytelling",
    "Pipeline reliability",
    "SQL/analytics depth",
    "Model monitoring",
  ],
  trades: [
    "Diagnostics methodology",
    "Safety and code updates",
    "Digital quoting/CRM",
    "Customer communication",
    "Specialty certifications",
  ],
  operations_clerical: [
    "Process exception handling",
    "No-code workflow automation",
    "Customer escalation judgment",
    "Spreadsheet/BI literacy",
    "Cross-team coordination",
  ],
  sales_marketing: [
    "Consultative selling",
    "CRM discipline",
    "Content differentiation",
    "Pipeline analytics",
    "Negotiation",
  ],
  management: [
    "Coaching conversations",
    "Prioritization frameworks",
    "Cross-functional influence",
    "Hiring signal design",
    "Operational metrics",
  ],
  generic: [
    "Domain specialization",
    "Digital literacy",
    "Structured problem solving",
    "Professional communication",
    "Portfolio evidence building",
  ],
};

/** Target-role gaps: growth skills for target family not present in current skills */
function computeSkillGaps(
  currentSkills: string[],
  currentFamily: RoleFamily,
  targetFamily: RoleFamily | null
): string[] {
  const have = new Set(currentSkills.map(canonicalSkill));
  const family = targetFamily || currentFamily;
  const growth = FAMILY_GROWTH_SKILLS[family] || FAMILY_GROWTH_SKILLS.generic;
  // Exact canonical match only — no substring (Java ≠ JavaScript)
  return growth.filter((g) => !have.has(canonicalSkill(g)));
}

/** Extract task signals from free-text responsibilities */
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
    if (/report|repetitive|data entry|گزارش تکراری|ورود داده|copy.?paste/.test(n)) {
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
  // BUG #12: languages only from explicit field — never from locale
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
  if (languages.length === 0) uncertainty.push("missing_language_proficiency");

  const roleFamily = detectFamily(currentRole, skills, industry || "");
  const specialization = detectSpecialization(roleFamily, currentRole, skills);
  const seniority = detectSeniority(currentRole, years);
  const familyTasks = tasksForFamily(roleFamily, specialization);
  const respTasks = tasksFromResponsibilities(input.responsibilities);
  // Actual responsibilities override/enrich family defaults
  const tasks =
    respTasks.length > 0
      ? [...respTasks, ...familyTasks.filter((ft) => !respTasks.some((r) => r.id === ft.id))].slice(0, 10)
      : familyTasks;

  const responsibilityLines = respTasks.map((t) => t.label);
  if (responsibilityLines.length === 0 && input.responsibilities?.trim()) {
    uncertainty.push("responsibilities_unparsed");
  } else if (!input.responsibilities?.trim()) {
    uncertainty.push("missing_responsibilities");
  }

  const classified = classifySkills(skills);

  // Target family/spec from TARGET ROLE text only — current skills must not rewrite target
  const targetRoleFamily = targetRole
    ? detectFamily(targetRole, [], industry || "")
    : null;
  // Target specialization from target role (+ career goal text), NEVER from current skill stack
  const targetSpecialization = targetRole
    ? detectSpecialization(
        targetRoleFamily || "generic",
        `${targetRole} ${careerGoal || ""}`.trim(),
        []
      )
    : null;

  const missingSkills = computeSkillGaps(
    skills,
    roleFamily,
    targetRoleFamily
  ).slice(0, 8);

  const transferableSkills = Array.from(
    new Set([
      ...classified.technicalSkills.slice(0, 6),
      ...classified.tools.slice(0, 3),
      ...tasks.filter((t) => t.judgment >= 70).map((t) => t.label),
    ])
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
      0
    ) / profile.tasks.length;
  let moat = avg;
  if (profile.seniority === "senior" || profile.seniority === "lead") moat += 5;
  if (profile.seniority === "manager") moat += 8;
  // BUG #11: experience influences moat more clearly
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
    (t) => t.judgment >= 70 || t.interpersonal >= 75 || t.regulatory >= 70
  );
}

export function taskLabel(t: TaskExposure, _locale?: CareerRiskLocale): string {
  return t.label;
}

/** Tool maturity from actual tools list — not technicalSkills length */
export function toolMaturityFromProfile(profile: CareerProfile): number {
  const n = profile.tools.length + Math.min(3, profile.technologies.length);
  return Math.min(90, 35 + n * 8);
}
