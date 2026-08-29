export type RiskLevel = "low" | "medium" | "high";

export type CareerRiskResult = {
  jobTitle: string;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  reasons: string[];
  skillsToBuild: string[];
  alternatives: string[];
  source: "ai" | "heuristic";
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Offline heuristic when AI is unavailable */
export function heuristicCareerRisk(
  jobTitle: string,
  skills?: string
): CareerRiskResult {
  const t = `${jobTitle} ${skills || ""}`.toLowerCase();

  const highHints = [
    "data entry",
    "cashier",
    "telemarketing",
    "transcription",
    "bookkeeping",
    "receptionist",
    "driver",
    "assembly",
    "call center",
    "proofreader",
  ];
  const lowHints = [
    "nurse",
    "doctor",
    "electrician",
    "plumber",
    "teacher",
    "therapist",
    "manager",
    "engineer",
    "designer",
    "sales",
    "lawyer",
    "chef",
  ];

  let score = 55;
  if (highHints.some((h) => t.includes(h))) score = 78;
  if (lowHints.some((h) => t.includes(h))) score = 28;
  if (t.includes("ai") || t.includes("machine learning")) score = 25;
  if (t.includes("software") || t.includes("developer")) score = 45;

  const riskLevel = levelFromScore(score);

  return {
    jobTitle,
    riskScore: score,
    riskLevel,
    summary:
      riskLevel === "high"
        ? "This role has relatively high exposure to automation and AI tools over the next 5–10 years. Upskilling toward human-centered and technical hybrid skills is recommended."
        : riskLevel === "medium"
          ? "This role faces moderate automation pressure. Parts of the work may be assisted by AI, but human judgment remains important."
          : "This role currently shows lower automation risk, especially where physical presence, complex judgment, or relationship skills dominate.",
    reasons: [
      "Based on common automation patterns for similar job titles",
      "Routine, repetitive digital tasks are more exposed than creative or care work",
      "AI is more likely to assist than fully replace roles that need accountability",
    ],
    skillsToBuild: [
      "AI literacy (prompting, reviewing AI output)",
      "Domain expertise that AI cannot easily verify",
      "Communication and stakeholder management",
      "Problem-solving in ambiguous situations",
    ],
    alternatives: [
      "AI-assisted specialist in your current field",
      "Customer success / client-facing role",
      "Operations or project coordination",
      "Technical support with product knowledge",
    ],
    source: "heuristic",
  };
}

export function parseRiskJson(
  raw: string,
  fallbackTitle: string
): CareerRiskResult | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(raw.slice(start, end + 1));
    const riskScore = clampScore(Number(obj.riskScore));
    return {
      jobTitle: String(obj.jobTitle || fallbackTitle),
      riskScore,
      riskLevel: (obj.riskLevel as RiskLevel) || levelFromScore(riskScore),
      summary: String(obj.summary || ""),
      reasons: Array.isArray(obj.reasons)
        ? obj.reasons.map(String).slice(0, 6)
        : [],
      skillsToBuild: Array.isArray(obj.skillsToBuild)
        ? obj.skillsToBuild.map(String).slice(0, 8)
        : [],
      alternatives: Array.isArray(obj.alternatives)
        ? obj.alternatives.map(String).slice(0, 8)
        : [],
      source: "ai",
    };
  } catch {
    return null;
  }
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const p = plan.toLowerCase();
  return p !== "free" && p !== "";
}
