import { z } from "zod";
import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
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
  careerRiskAiOutputSchema,
} from "@/types/career-risk";

export function isPaidPlan(plan: string | null | undefined): boolean {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "business" || p === "enterprise";
}

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Single source of truth: score → level */
export function scoreToRiskLevel(score: number): CareerRiskLevel {
  const s = clampScore(score);
  if (s < 35) return "low";
  if (s < 65) return "medium";
  return "high";
}

function asStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

export function compositeFromSubScores(s: CareerRiskSubScores): number {
  const base =
    s.taskAutomation *
    (0.45 + 0.3 * (s.toolMaturity / 100) + 0.25 * (s.marketAdoption / 100));
  const withAgents = base + 0.1 * s.agenticExposure;
  return clampScore(withAgents);
}

function extractJsonObject(text: string): unknown | null {
  if (!text || typeof text !== "string") return null;
  let jsonStr = text.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) jsonStr = fence[1].trim();
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(jsonStr.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Parse + Zod-validate AI output.
 * Always forces user jobTitle; always derives riskLevel from riskScore.
 * Missing required subScores → null (caller uses heuristic).
 */
export function parseRiskJson(
  text: string,
  userJobTitle: string
): CareerRiskAnalysis | null {
  const raw = extractJsonObject(text);
  if (!raw) return null;

  const parsed = careerRiskAiOutputSchema.safeParse(raw);
  if (!parsed.success) return null;

  const data = parsed.data;
  let riskScore = clampScore(data.riskScore);

  let subScores: CareerRiskSubScores | undefined;
  if (data.subScores) {
    subScores = {
      taskAutomation: clampScore(data.subScores.taskAutomation),
      toolMaturity: clampScore(data.subScores.toolMaturity),
      marketAdoption: clampScore(data.subScores.marketAdoption),
      agenticExposure: clampScore(data.subScores.agenticExposure),
    };
  }

  // If model omitted overall score but gave full subScores, derive score
  if (
    subScores &&
    (data.riskScore === undefined ||
      data.riskScore === null ||
      Number.isNaN(Number((raw as { riskScore?: unknown }).riskScore)))
  ) {
    riskScore = compositeFromSubScores(subScores);
  }

  const title = (userJobTitle || "Your role").trim().slice(0, 120);

  return {
    jobTitle: title,
    riskScore,
    riskLevel: scoreToRiskLevel(riskScore),
    summary: data.summary.slice(0, 2500),
    reasons: data.reasons.map((r) => r.trim()).filter(Boolean).slice(0, 10),
    skillsToBuild: data.skillsToBuild
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 12),
    alternatives: (data.alternatives || [])
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 10),
    source: "ai",
    subScores,
    timeHorizon: data.timeHorizon || "5–10 years",
    confidence:
      data.confidence != null ? clampScore(data.confidence) : undefined,
    industryOutlook: data.industryOutlook?.slice(0, 500),
  };
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
  ];
  const lowRiskHints = [
    "nurse",
    "electrician",
    "plumber",
    "therapist",
    "teacher",
    "surgeon",
    "caregiver",
    "firefighter",
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
      "Software and analytical roles are being reshaped by AI assistants; routine implementation is under the most pressure."
    );
    skillsToBuild.push(
      "System design & architecture",
      "AI-assisted development (prompting + review)",
      "Testing & quality engineering",
      "Cloud / DevOps fundamentals"
    );
    alternatives.push(
      "Full-stack engineer with product ownership",
      "Platform / DevOps engineer",
      "Technical product manager"
    );
  }

  if (
    titleLower.includes("frontend") ||
    titleLower.includes("front-end") ||
    titleLower.includes("react")
  ) {
    taskAutomation += 8;
    toolMaturity += 10;
    reasons.push(
      "UI scaffolding is increasingly generated by AI; differentiation shifts to UX judgment, accessibility, and performance."
    );
    skillsToBuild.push(
      "Advanced React / Next.js patterns",
      "Design systems & accessibility (a11y)",
      "Web performance optimization"
    );
  }

  if (
    titleLower.includes("accountant") ||
    industryLower.includes("accounting")
  ) {
    taskAutomation += 18;
    toolMaturity += 15;
    marketAdoption += 12;
    reasons.push(
      "Transaction processing and standard reporting are strong automation targets; advisory work remains more defensible."
    );
    skillsToBuild.push("Financial analysis & advisory", "ERP / systems literacy");
    alternatives.push("Financial analyst", "FP&A specialist");
  }

  if (skillText.includes("excel") && !techHints.some((h) => titleLower.includes(h))) {
    taskAutomation += 8;
    reasons.push(
      "Spreadsheet-heavy workflows are a common target for automation and AI copilots."
    );
  }

  if (years != null && years >= 8) {
    taskAutomation -= 5;
    reasons.push(
      "Longer experience often correlates with judgment and ownership that are harder to automate."
    );
  } else if (years != null && years <= 2) {
    taskAutomation += 5;
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
    riskLevel: scoreToRiskLevel(score),
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

// silence unused if tree-shaken
void z;
void asStringArray;
