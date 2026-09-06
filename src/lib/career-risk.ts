import type {
  CareerRiskAnalysis,
  CareerRiskLevel,
  CareerRiskSource,
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
    const riskScore = clampScore(Number(obj.riskScore));
    const analysis: CareerRiskAnalysis = {
      jobTitle: String(obj.jobTitle || fallbackTitle).slice(0, 120),
      riskScore,
      riskLevel: normalizeLevel(obj.riskLevel, riskScore),
      summary: String(obj.summary || "").slice(0, 2000),
      reasons: asStringArray(obj.reasons, 10),
      skillsToBuild: asStringArray(obj.skillsToBuild, 12),
      alternatives: asStringArray(obj.alternatives, 10),
      source: "ai",
    };
    if (!analysis.summary) return null;
    return analysis;
  } catch {
    return null;
  }
}

export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string
): CareerRiskAnalysis {
  const title = (jobTitle || "Your role").trim().slice(0, 120);
  const skillText = (skills || "").toLowerCase();
  const titleLower = title.toLowerCase();

  let score = 45;
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
  ];
  const lowRiskHints = [
    "nurse",
    "electrician",
    "plumber",
    "therapist",
    "teacher",
    "manager",
    "engineer",
  ];

  if (highRiskHints.some((h) => titleLower.includes(h))) {
    score += 25;
    reasons.push(
      "This role type often includes repetitive tasks that automation can absorb."
    );
  }
  if (lowRiskHints.some((h) => titleLower.includes(h))) {
    score -= 15;
    reasons.push(
      "Roles with high human interaction or physical presence tend to face lower near-term automation pressure."
    );
  }

  if (
    skillText.includes("python") ||
    skillText.includes("ai") ||
    skillText.includes("machine learning")
  ) {
    score -= 10;
    reasons.push(
      "Technical and AI-adjacent skills can reduce exposure to routine automation."
    );
    skillsToBuild.push("System design", "Domain expertise", "AI tooling literacy");
  } else {
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

  score = clampScore(score);
  alternatives.push(
    "Adjacent specialist role in the same industry",
    "Team lead / coordination path",
    "Hybrid role combining domain knowledge with digital tools"
  );

  return {
    jobTitle: title,
    riskScore: score,
    riskLevel: normalizeLevel(null, score),
    summary:
      score >= 65
        ? `${title} shows elevated automation exposure over the next 5–10 years. Focus on skills that complement AI rather than compete with it.`
        : score >= 35
          ? `${title} faces moderate change from AI and automation. Upskilling in the right areas can keep the role resilient.`
          : `${title} appears relatively resilient near-term, but continuous learning still matters as tools evolve.`,
    reasons: reasons.slice(0, 6),
    skillsToBuild: skillsToBuild.slice(0, 8),
    alternatives: alternatives.slice(0, 5),
    source: "heuristic",
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
