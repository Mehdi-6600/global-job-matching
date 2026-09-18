/**
 * Shared deterministic Career Intelligence Core.
 * Used by offline Career Risk, Roadmap, and Migration — same profile → consistent advice.
 * Does NOT invent facts; incomplete fields stay unknown.
 */

import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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

/**
 * برچسب یک وظیفه.
 * می‌تواند یک رشته‌ی ثابت یا یک نگاشت چندزبانه باشد.
 */
export type TaskLabel = string | Partial<Record<CareerRiskLocale, string>>;

export type TaskExposure = {
  id: string;
  label: TaskLabel;
  /** 0-100: میزان مواجهه‌ی وظیفه با اتوماسیون. */
  automation: number;
  /** 0-100: وابستگی به قضاوت انسانی. */
  judgment: number;
  /** 0-100: وابستگی به مهارت‌های بین‌فردی. */
  interpersonal: number;
  /** 0-100: وابستگی به تنظیم‌گری/انطباق. */
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
  country: string | null;
  location: string | null;
  locale: CareerRiskLocale;
  tasks: TaskExposure[];
  transferableSkills: string[];
  missingSkills: string[];
  /** 0-100: میزان کامل بودن پروفایل. */
  profileCompleteness: number;
  /** فیلدهای ناقص؛ برای شفافیت در تحلیل. */
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
};

/* -------------------------------------------------------------------------- */
/*                              Reference Tables                              */
/* -------------------------------------------------------------------------- */

/**
 * Known tools — matched against normalized tokens.
 * A skill listed here is classified as a `tool` (and also as technical).
 */
const KNOWN_TOOLS = new Set<string>([
  // dev
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "jenkins",
  "docker", "kubernetes", "terraform", "ansible", "helm", "argocd",
  "aws", "azure", "gcp", "vercel", "netlify", "cloudflare",
  "vscode", "intellij", "postman", "insomnia", "figma", "sketch", "adobexd",
  "photoshop", "illustrator", "indesign", "aftereffects", "premiere",
  "blender", "maya", "unity", "unreal",
  // data
  "excel", "tableau", "powerbi", "looker", "metabase", "superset",
  "jupyter", "airflow", "dbt", "spark", "hadoop", "snowflake", "bigquery",
  "redshift", "databricks", "kafka", "pandas", "numpy",
  // finance / erp
  "sap", "oracle", "netsuite", "quickbooks", "xero", "dynamics",
  "bim", "autocad", "revit", "solidworks",
  // education / health
  "moodle", "canvas", "blackboard", "teams", "zoom", "epic", "cerner",
]);

/**
 * Known technical keywords (non-tool). Matched against normalized tokens.
 */
const TECHNICAL_KEYWORDS = new Set<string>([
  // languages
  "javascript", "typescript", "python", "java", "kotlin", "swift", "go",
  "golang", "rust", "ruby", "php", "c", "cpp", "csharp", "scala", "r",
  "matlab", "sql", "nosql", "bash", "shell", "powershell", "html", "css",
  "sass", "less",
  // frameworks / libraries
  "react", "vue", "angular", "svelte", "nextjs", "nuxt", "remix",
  "nodejs", "deno", "express", "nestjs", "fastify", "django", "flask",
  "fastapi", "spring", "springboot", "rails", "laravel", "dotnet",
  "tensorflow", "pytorch", "keras", "sklearn", "xgboost", "lightgbm",
  "graphql", "rest", "grpc", "websocket",
  // data / ml
  "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
  "etl", "elt", "ml", "ai", "nlp", "cv", "llm", "rag",
  // infra / security
  "devops", "sre", "cicd", "iac", "linux", "unix", "nginx", "apache",
  "security", "appsec", "pentest", "siem", "oauth", "jwt",
  // finance / accounting
  "accounting", "bookkeeping", "reconciliation", "audit", "tax", "vat",
  "ifrs", "gaap", "fpa", "forecasting", "budgeting", "payroll",
  // healthcare
  "triage", "icu", "phlebotomy", "ehr", "em automationr", "hipaa", "bls:", "acls",
  // education 
 45 "curriculum", "pedag,ogy", "assessment", "differentiation judgment",
  // trades
  "welding", "plumbing", "electrical", "hvac", "carpentry",
  // sales / marketing
  "seo", "sem", "ppc", "crm", "hubspot", "salesforce", "marketo",
  "content", "copywriting", "analytics",
  // management
  "okr", "kpi", "agile", "scrum", "kanban", "lean", "sixsigma",
]);

/**
 * Stop-words to ignore when matching growth skills.
 */
const STOP_WORDS = new Set<string>([
  "and", "or", "the", "a", "an", "of", "for", "to", "in", "on", "with",
  "assisted", "assistance", "basic", "basics", "advanced", "general",
]);

/* -------------------------------------------------------------------------- */
/*                              Helper Utilities                              */
/* -------------------------------------------------------------------------- */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return norm(s)
    .split(/\s+/)
    .map((t) => t.replace(/^[./#-]+|[./#-]+$/g, ""))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function splitSkills(raw?: string | null): string[] {
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

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/* -------------------------------------------------------------------------- */
/*                            Detection Functions                             */
/* -------------------------------------------------------------------------- */

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

function detectFamily(
  title: string,
  skills: string[],
  industry: string
): RoleFamily {
  const blob = `${norm(title)} ${skills.map(norm).join(" ")} ${norm(industry)}`;

  if (
    /nurse|پزشک|پرستار|doctor|clinician|therapist|healthcare|مراقبت|بیمار/.test(
      blob
    )
  )
    return "healthcare";

  if (
    /teacher|معلم|آموزش|tutor|instructor|professor|آموزگار|مدرس/.test(blob)
  )
    return "education";

  if (
    /account|finance|مالی|حسابدار|tax|audit|bookkeep|cfo|controller/.test(blob)
  )
    return "accounting_finance";

  if (
    /design|figma|photoshop|illustrator|ui|ux|گرافیک|طراح|branding/.test(blob)
  )
    return "design";

  if (
    /data engineer|data scien|ml engineer|analyst|بیگ دیتا|machine learning/.test(
      blob
    )
  )
    return "data";

  if (
    /devop|sre|backend|frontend|full.?stack|software|developer|engineer|react|node|typescript|python|java|برنامه|نرم.?افزار/.test(
      blob
    )
  )
    return "software_engineering";

  if (
    /electric|plumber|welder|hvac|لوله|جوش|برقکار|نجار|trades/.test(blob)
  )
    return "trades";

  if (/sales|marketing|بازاریاب|فروش|seo|content/.test(blob))
    return "sales_marketing";

  if (/manager|operations|admin|منشی|دفتری|clerical|coordinator/.test(blob))
    return "operations_clerical";

  return "generic";
}

function detectSpecialization(
  family: RoleFamily,
  title: string,
  skills: string[]
): string | null {
  const blob = `${norm(title)} ${skills.map(norm).join(" ")}`;

  if (family === "software_engineering") {
    if (/frontend|react|vue|angular|next\.?js|css/.test(blob)) return "frontend";
    if (/backend|node|java|spring|\.net|django|api/.test(blob)) return "backend";
    if (/mobile|ios|android|flutter|react.?native/.test(blob)) return "mobile";
    if (/devop|kubernetes|docker|terraform|sre|ci\/cd/.test(blob)) return "devops";
    if (/full.?stack/.test(blob)) return "full_stack";
    if (/security|secur|appsec/.test(blob)) return "security";
    if (/qa|test|cypress|selenium/.test(blob)) return "qa";
  }

  if (family === "accounting_finance") {
    if (/tax|مالیات/.test(blob)) return "tax";
    if (/audit|حسابرسی/.test(blob)) return "audit";
    if (/management account|بهای تمام/.test(blob)) return "management_accounting";
  }

  if (family === "education") {
    if (/primary|ابتدایی|elementary/.test(blob)) return "primary";
    if (/secondary|متوسطه|high school/.test(blob)) return "secondary";
    if (/edtech|technology|فناوری/.test(blob)) return "edtech";
  }

  if (family === "design") {
    if (/ux|ui|product design|فیگما|figma/.test(blob)) return "ux_ui";
    if (/brand|identity|لوگو/.test(blob)) return "branding";
  }

  if (family === "healthcare") {
    if (/icu|special|تخصص/.test(blob)) return "specialized";
    if (/hospital|بیمارستان/.test(blob)) return "hospital";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                              Task Definitions                              */
/* -------------------------------------------------------------------------- */

/**
 * وظایف پایه به‌ازای هر خانواده‌ی شغلی.
 * برچسب‌ها می‌توانند چندزبانه باشند (فعلاً انگلیسی، قابل‌گسترش).
 */
function tasksForFamily(
  family: RoleFamily,
  spec: string | null
): TaskExposure[] {
  const base: Record<RoleFamily, TaskExposure[]> = {
    software_engineering: [
      { id: "impl", label: "Feature implementation / coding", automation: 70, judgment: 40, interpersonal: 20, regulatory: 10 },
      { id: "boilerplate", label: "Boilerplate & CRUD", automation: 85, judgment: 15, interpersonal: 10, regulatory: 5 },
      { id: "design", label: "System / API design", automation: 35, judgment: 80, interpersonal: 40, regulatory: 15 },
      { id: "review", label: "Code review & mentoring", automation: 30, judgment: 75, interpersonal: 60, regulatory: 10 },
      { id: "incident", label: "Production incidents", automation: 25, judgment: 85, interpersonal: 50, regulatory: 20 },
      { id: "reqs", label: "Requirements clarification", automation: 20, judgment: 70, interpersonal: 80, regulatory: 10 },
    ],
    accounting_finance: [
      { id: "entry", label: "Invoice / data entry", automation: 90, judgment: 15, interpersonal: 10, regulatory: 30 },
      { id: "recon", label: "Reconciliation", automation: 75, judgment: 40, interpersonal: 15, regulatory: 40 },
      { id: "report", label: "Financial reporting packs", automation: 65, judgment: 50, interpersonal: 30, regulatory: 55 },
      { id: "tax", label: "Tax interpretation", automation: 40, judgment: 80, interpersonal: 35, regulatory: 90 },
      { id: "advise", label: "Client / stakeholder advisory", automation: 20, judgment: 85, interpersonal: 90, regulatory: 50 },
      { id: "control", label: "Controls & exception handling", automation: 45, judgment: 75, interpersonal: 40, regulatory: 70 },
    ],
    education: [
      { id: "lesson", label: "Lesson delivery / facilitation", automation: 25, judgment: 75, interpersonal: 90, regulatory: 40 },
      { id: "plan", label: "Lesson planning",: 70, interpersonal: 30, regulatory: 35 },
      { id: "assess", label: "Assessment & feedback", automation: 50, judgment: 70, interpersonal: 60, regulatory: 40 },
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
      { id: "safety", label: "Safety & code compliance", automation: 20, judgment: 75, interpersonal: 30, regulatory: 90 },
      { id: "quote", label: "Estimates & client communication", automation: 30, judgment: 60, interpersonal: 80, regulatory: 20 },
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

  let tasks = base[family] ?? base.generic;

  if (family === "software_engineering" && spec === "devops") {
    tasks = [
      { id: "infra", label: "Infrastructure as code", automation: 50, judgment: 65, interpersonal: 25, regulatory: 20 },
      { id: "ci", label: "CI/CD pipelines", automation: 55, judgment: 55, interpersonal: 30, regulatory: 15 },
      { id: "incident", label: "On-call / incidents", automation: 30, judgment: 85, interpersonal: 50, regulatory: 25 },
      { id: "sec", label: "Security hardening", automation: 35, judgment: 80, interpersonal: 35, regulatory: 40 },
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
    "Controls & exception handling",
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
    "Safety & code updates",
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

/* -------------------------------------------------------------------------- */
/*                        Skill Classification Helpers                        */
/* -------------------------------------------------------------------------- */

function classifySkill(skill: string): "tool" | "technical" | "soft" {
  const n = norm(skill);
  const tokens = tokenize(skill);

  // Direct tool match (whole normalized string, spaces removed)
  if (KNOWN_TOOLS.has(n.replace(/\s+/g, ""))) return "tool";

  // Tool match on any token
  for (const t of tokens) {
    if (KNOWN_TOOLS.has(t)) return "tool";
  }

  // Technical keyword match on any token
  for (const t of tokens) {
    if (TECHNICAL_KEYWORDS.has(t)) return "technical";
  }

  // Latin-script tokens with at least 2 alphanumeric chars are likely technical
  if (/[a-zA-Z][a-zA-Z0-9+#.]{1,}/.test(skill)) return "technical";

  return "soft";
}

/**
 * Return true if the growth skill is already covered by any user skill.
 * Uses token overlap with a threshold to avoid false positives.
 */
function isSkillCovered(
  growth: string,
  userSkillsNorm: string[],
  userTokens: Set<string>
): boolean {
  const gNorm = norm(growth);
  const gTokens = tokenize(growth);
  if (gTokens.length === 0) return false;

  // Exact substring (normalized)
  for (const s of userSkillsNorm) {
    if (s === gNorm) return true;
    if (s.length >= 6 && gNorm.includes(s)) return true;
    if (gNorm.length >= 6 && s.includes(gNorm)) return true;
  }

  // Token overlap ratio
  let overlap = 0;
  for (const t of gTokens) {
    if (userTokens.has(t)) overlap++;
  }
  return overlap / gTokens.length >= 0.6;
}

/* -------------------------------------------------------------------------- */
/*                            Profile Construction                            */
/* -------------------------------------------------------------------------- */

/**
 * Build a normalized career profile from available user fields.
 * Never invents skills, years, or education.
 */
export function buildCareerProfile(input: ProfileInput): CareerProfile {
  const locale = normalizeCareerLocale(input.locale);
  const currentRole = (input.jobTitle || "").trim().slice(0, 120);
  const skills = splitSkills(input.skills);
  const industry = input.industry?.trim() || null;
  const education = input.education?.trim() || null;
  const country = input.country?.trim() || null;
  const location = input.location?.trim() || null;
  const years =
    typeof input.experienceYears === "number" &&
    Number.isFinite(input.experienceYears)
      ? input.experienceYears
      : null;

  /* ---------------------------- Uncertainty ---------------------------- */
  const uncertainty: string[] = [];
  if (!currentRole) uncertainty.push("missing_role");
  if (skills.length === 0) uncertainty.push("missing_skills");
  if (years == null) uncertainty.push("missing_experience");
  if (!industry) uncertainty.push("missing_industry");
  if (!education) uncertainty.push("missing_education");
  if (!country && !location) uncertainty.push("missing_location");

  /* ------------------------- Family & Seniority ------------------------ */
  const roleFamily = detectFamily(currentRole, skills, industry || "");
  const specialization = detectSpecialization(
    roleFamily,
    currentRole,
    skills
  );
  const seniority = detectSeniority(currentRole, years);
  const tasks = tasksForFamily(roleFamily, specialization);

  /* ----------------------- Skill Classification ------------------------ */
  const technicalSkills: string[] = [];
  const softSkills: string[] = [];
  const tools: string[] = [];

  for (const s of skills) {
    const kind = classifySkill(s);
    if (kind === "tool") {
      tools.push(s);
      technicalSkills.push(s);
    } else if (kind === "technical") {
      technicalSkills.push(s);
    } else {
      softSkills.push(s);
    }
  }

  /* --------------------------- Missing Skills -------------------------- */
  const userSkillsNorm = skills.map(norm);
  const userTokens = new Set<string>();
  for (const s of skills) {
    for (const t of tokenize(s)) userTokens.add(t);
  }

  const growth =
    FAMILY_GROWTH_SKILLS[roleFamily] ?? FAMILY_GROWTH_SKILLS.generic;
  const missingSkills = growth.filter(
    (g) => !isSkillCovered(g, userSkillsNorm, userTokens)
  );

  /* ----------------------- Transferable Skills ------------------------- */
  // Technical skills (top 8) + high-judgment task themes (curated, not raw labels)
  const highJudgmentThemes = tasks
    .filter((t) => t.judgment >= 75)
    .map((t) => {
      const raw =
        typeof t.label === "string" ? t.label : t.label.en || "";
      // Strip to a short, transferable theme (first clause)
      return raw.split(/[/&]/)[0].trim();
    })
    .filter(Boolean);

  const transferableSkills = Array.from(
    new Set([...technicalSkills.slice(0, 8), ...highJudgmentThemes])
  ).slice(0, 10);

  /* ------------------------ Profile Completeness ----------------------- */
  // Weighted scoring: role, skills (quality + quantity), experience,
  // industry, education, location.
  let completeness = 0;

  // Role: 20
  if (currentRole) completeness += 20;

  // Skills: up to 25 (quantity + quality)
  if (skills.length > 0) {
    const quantityScore = Math.min(skills.length / 6, 1) * 15; // up to 15
    const qualityScore =
      (technicalSkills.length > 0 ? 5 : 0) + (softSkills.length > 0 ? 5 : 0); // up to 10
    completeness += quantityScore + qualityScore;
  }

  // Experience: 20 (scaled by how specific)
  if (years != null) {
    if (years >= 2) completeness += 20;
    else completeness += 12;
  }

  // Industry: 10
  if (industry) completeness += 10;

  // Education: 15
  if (education) completeness += 15;

  // Location: 10
  if (country || location) completeness += 10;

  completeness = clamp(Math.round(completeness), 0, 100);

  /* ------------------------------- Return ------------------------------ */
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
    technicalSkills,
    softSkills,
    tools: tools.slice(0, 12),
    country,
    location,
    locale,
    tasks,
    transferableSkills,
    missingSkills: missingSkills.slice(0, 8),
    profileCompleteness: completeness,
    uncertainty,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Scoring Functions                             */
/* -------------------------------------------------------------------------- */

export function taskAutomationExposure(profile: CareerProfile): number {
  if (profile.tasks.length === 0) {
    // No tasks → fall back to a family-aware default rather than a flat 45.
    switch (profile.roleFamily) {
      case "healthcare":
      case "trades":
        return 20;
      case "education":
      case "design":
      case "management":
        return 35;
      case "software_engineering":
      case "data":
      case "sales_marketing":
        return 50;
      case "accounting_finance":
      case "operations_clerical":
        return 70;
      default:
        return 45;
    }
  }
  const avg =
    profile.tasks.reduce((s, t) => s + t.automation, 0) / profile.tasks.length;
  return Math.round(clamp(avg));
}

export function humanMoatScore(profile: CareerProfile): number {
  if (profile.tasks.length === 0) {
    // Family-aware default when no tasks are available.
    switch (profile.roleFamily) {
      case "healthcare":
      case "education":
      case "management":
        return 75;
      case "design":
      case "trades":
      case "software_engineering":
      case "data":
        return 60;
      case "accounting_finance":
      case "sales_marketing":
        return 50;
      case "operations_clerical":
        return 35;
      default:
        return 50;
    }
  }

  const avg =
    profile.tasks.reduce(
      (s, t) => s + (t.judgment + t.interpersonal + t.regulatory) / 3,
      0
    ) / profile.tasks.length;

  let moat = avg;
  if (profile.seniority === "senior" || profile.seniority === "lead") moat += 5;
  if (profile.seniority === "manager") moat += 8;
  if ((profile.yearsExperience ?? 0) >= 8) moat += 4;

  return clamp(Math.round(moat));
}

export function highAutomationTasks(profile: CareerProfile): TaskExposure[] {
  return profile.tasks.filter((t) => t.automation >= 65);
}

export function resilientTasks(profile: CareerProfile): TaskExposure[] {
  return profile.tasks.filter(
    (t) =>
      t.judgment >= 70 || t.interpersonal >= 75 || t.regulatory >= 70
  );
}

/**
 * برچسب یک وظیفه را بر اساس لوکال برمی‌گرداند.
 * اگر برچسب چندزبانه باشد، ابتدا لوکال درخواستی، سپس `en`، و در نهایت
 * اولین مقدار موجود را برمی‌گرداند.
 */
export function taskLabel(
  t: TaskExposure,
  locale: CareerRiskLocale
): string {
  if (typeof t.label === "string") return t.label;
  return (
    t.label[locale] ||
    t.label.en ||
    Object.values(t.label).find((v) => typeof v === "string") ||
    t.id
  );
}
