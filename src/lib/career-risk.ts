import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskSource,
  CareerRiskSubScores,
  CareerRiskSuccessResponse,
} from "@/types/career-risk";

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

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

function normalizeLevel(raw: unknown, score: number): CareerRiskLevel {
  const s = String(raw || "").toLowerCase();
  if (s === "low" || s === "medium" || s === "high") return s;
  if (score < 35) return "low";
  if (score < 65) return "medium";
  return "high";
}

function parseSubScores(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const taskAutomation = clampScore(Number(o.taskAutomation));
  const toolMaturity = clampScore(Number(o.toolMaturity));
  const marketAdoption = clampScore(Number(o.marketAdoption));
  const agenticExposure = clampScore(Number(o.agenticExposure));
  // If all NaN → zeros from clamp of NaN handled; still return structure
  return {
    taskAutomation,
    toolMaturity,
    marketAdoption,
    agenticExposure,
  };
}

/** Weighted composite if model omitted overall score */
export function compositeFromSubScores(s: CareerRiskSubScores): number {
  // Align with public-style formulas: automation dominant, tools & adoption amplify, agents add
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  const withAgents = base + 0.1 * s.agenticExposure;
  return clampScore(withAgents);
}

export function parseRiskJson(
  text: string,
  fallbackTitle: string
): CareerRiskAnalysis | null {
  if (!text || typeof text !== "string") return null;

  let jsonStr = text.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();

  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const obj = JSON.parse(jsonStr.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const subScores = parseSubScores(obj.subScores);
    let riskScore = clampScore(Number(obj.riskScore));
    if (
      (!Number.isFinite(Number(obj.riskScore)) || Number(obj.riskScore) === 0) &&
      subScores
    ) {
      riskScore = compositeFromSubScores(subScores);
    }
    if (subScores && !Number.isFinite(Number(obj.riskScore))) {
      riskScore = compositeFromSubScores(subScores);
    }

    const analysis: CareerRiskAnalysis = {
      jobTitle: String(obj.jobTitle || fallbackTitle).slice(0, 120),
      riskScore,
      riskLevel: normalizeLevel(obj.riskLevel, riskScore),
      summary: String(obj.summary || "").slice(0, 2500),
      reasons: asStringArray(obj.reasons, 10),
      skillsToBuild: asStringArray(obj.skillsToBuild, 12),
      alternatives: asStringArray(obj.alternatives, 10),
      source: "ai",
      subScores,
      timeHorizon: obj.timeHorizon
        ? String(obj.timeHorizon).slice(0, 40)
        : "5–10 years",
      confidence: obj.confidence != null ? clampScore(Number(obj.confidence)) : undefined,
      industryOutlook: obj.industryOutlook
        ? String(obj.industryOutlook).slice(0, 500)
        : undefined,
    };
    if (!analysis.summary) return null;
    return analysis;
  } catch {
    return null;
  }
}

export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string,
  extra?: {
    industry?: string;
    experienceYears?: number;
    country?: string;
  }
): CareerRiskAnalysis {
  const title = (jobTitle || "Your role").trim().slice(0, 120);
  const skillText = (skills || "").toLowerCase();
  const titleLower = title.toLowerCase();
  const industryLower = (extra?.industry || "").toLowerCase();
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

  const highRiskHints = [
    "data entry",
    "cashier",
    "telemarketer",
    "receptionist",
    "clerk",
    "transcription",
    "call center",
    "bookkeeper",
    "proofreader",
    "translator",
  ];
  const lowRiskHints = [
    "nurse",
    "electrician",
    "plumber",
    "therapist",
    "teacher",
    "surgeon",
    "caregiver",
    "physio",
    "firefighter",
    "chef",
  ];
  const techHints = [
    "developer",
    "engineer",
    "frontend",
    "backend",
    "full stack",
    "fullstack",
    "software",
    "programmer",
    "devops",
    "data scientist",
    "analyst",
  ];

  if (highRiskHints.some((h) => titleLower.includes(h))) {
    taskAutomation += 30;
    toolMaturity += 20;
    marketAdoption += 25;
    agenticExposure += 15;
    reasons.push(
      "This role type often includes repetitive, well-specified tasks that automation can absorb."
    );
  }

  if (lowRiskHints.some((h) => titleLower.includes(h))) {
    taskAutomation -= 20;
    agenticExposure -= 15;
    marketAdoption -= 10;
    reasons.push(
      "Roles with high human interaction, physical presence, or regulated care tend to face lower near-term automation pressure."
    );
  }

  if (techHints.some((h) => titleLower.includes(h))) {
    taskAutomation += 12;
    toolMaturity += 25;
    marketAdoption += 20;
    agenticExposure += 18;
    reasons.push(
      "Software and analytical roles are being reshaped by AI coding and analysis assistants; routine implementation is under the most pressure."
    );
    reasons.push(
      "People who design systems, own outcomes, and critically review AI output stay more resilient."
    );
    skillsToBuild.push(
      "System design & architecture",
      "AI-assisted development (prompting + review)",
      "Testing & quality engineering",
      "Cloud / DevOps fundamentals",
      "Product thinking & stakeholder communication"
    );
    alternatives.push(
      "Full-stack engineer with product ownership",
      "Platform / DevOps engineer",
      "Technical product manager",
      "AI application engineer"
    );
  }

  if (
    titleLower.includes("frontend") ||
    titleLower.includes("front-end") ||
    titleLower.includes("react") ||
    titleLower.includes("ui engineer")
  ) {
    taskAutomation += 8;
    toolMaturity += 10;
    reasons.push(
      "UI scaffolding and boilerplate are increasingly generated by AI; differentiation shifts to UX judgment, accessibility, and performance."
    );
    skillsToBuild.push(
      "Advanced React / Next.js patterns",
      "Design systems & accessibility (a11y)",
      "Web performance optimization",
      "Component architecture"
    );
    alternatives.push(
      "Design engineer / UX engineer",
      "Frontend platform specialist"
    );
  }

  if (
    titleLower.includes("accountant") ||
    titleLower.includes("bookkeep") ||
    industryLower.includes("accounting")
  ) {
    taskAutomation += 18;
    toolMaturity += 15;
    marketAdoption += 12;
    reasons.push(
      "Transaction processing and standard reporting are strong automation targets; advisory and judgment work remains more defensible."
    );
    skillsToBuild.push(
      "Financial analysis & advisory",
      "Systems / ERP literacy",
      "Data storytelling"
    );
    alternatives.push("Financial analyst", "FP&A specialist", "Audit technology specialist");
  }

  if (skillText.includes("excel") && !techHints.some((h) => titleLower.includes(h))) {
    taskAutomation += 8;
    toolMaturity += 5;
    reasons.push(
      "Spreadsheet-heavy workflows are a common target for automation and AI copilots."
    );
  }

  if (years != null && years >= 8) {
    taskAutomation -= 5;
    reasons.push(
      "Longer experience often correlates with judgment, mentoring, and ownership that are harder to automate."
    );
  } else if (years != null && years <= 2) {
    taskAutomation += 5;
    reasons.push(
      "Early-career roles often include more standardized tasks that tools can partially cover."
    );
  }

  if (skillsToBuild.length === 0) {
    skillsToBuild.push(
      "Digital literacy",
      "Problem solving",
      "Communication",
      "Domain specialization"
    );
    reasons.push(
      "Building durable, hard-to-automate skills improves long-term resilience."
    );
  }

  if (alternatives.length === 0) {
    alternatives.push(
      "Adjacent specialist role in the same industry",
      "Team lead / coordination path",
      "Hybrid role combining domain knowledge with digital tools"
    );
  }

  const subScores: CareerRiskSubScores = {
    taskAutomation: clampScore(taskAutomation),
    toolMaturity: clampScore(toolMaturity),
    marketAdoption: clampScore(marketAdoption),
    agenticExposure: clampScore(agenticExposure),
  };
  const score = compositeFromSubScores(subScores);

  const summary =
    score >= 65
      ? `${title} shows elevated automation exposure over the next 5–10 years. Focus on skills that complement AI rather than compete with it.`
      : score >= 35
        ? `${title} faces moderate change from AI and automation. Upskilling in architecture, AI tooling, and human judgment can keep the role resilient.`
        : `${title} appears relatively resilient near-term, but continuous learning still matters as tools evolve.`;

  return {
    jobTitle: title,
    riskScore: score,
    riskLevel: normalizeLevel(null, score),
    summary,
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    skillsToBuild: Array.from(new Set(skillsToBuild)).slice(0, 8),
    alternatives: Array.from(new Set(alternatives)).slice(0, 5),
    source: "heuristic",
    subScores,
    timeHorizon: "5–10 years",
    confidence: 55,
    industryOutlook: extra?.industry
      ? `Industry context: ${extra.industry}. Local market conditions may shift the score.`
      : undefined,
  };
}

export function toSuccessResponse(params: {
  analysis: CareerRiskAnalysis;
  paid: boolean;
  assessmentId?: string;
  shareToken?: string;
}): CareerRiskSuccessResponse {
  const alternatives = params.paid ? params.analysis.alternatives : [];
  const analysis: CareerRiskAnalysis = {
    ...params.analysis,
    alternatives,
  };
  return {
    success: true,
    analysis,
    paid: params.paid,
    alternativesLocked: !params.paid,
    message: params.paid
      ? undefined
      : "Upgrade to Pro to unlock alternative role recommendations.",
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
