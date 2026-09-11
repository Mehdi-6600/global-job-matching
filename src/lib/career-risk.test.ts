import { describe, expect, it } from "vitest";
import {
  parseRiskJson,
  scoreToRiskLevel,
  heuristicCareerRisk,
  clampScore,
} from "@/lib/career-risk";

describe("scoreToRiskLevel", () => {
  it("maps ranges deterministically", () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(34)).toBe("low");
    expect(scoreToRiskLevel(35)).toBe("medium");
    expect(scoreToRiskLevel(64)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(100)).toBe("high");
  });
});

describe("parseRiskJson", () => {
  const title = "Accountant";

  it("accepts valid structured JSON and keeps user title", () => {
    const raw = JSON.stringify({
      jobTitle: "Financial Analyst",
      riskScore: 72,
      riskLevel: "low",
      summary:
        "This role has meaningful automation exposure in reporting and bookkeeping tasks over the next decade.",
      reasons: ["Repetitive ledger work", "Standard tax software"],
      skillsToBuild: ["Advisory", "Systems literacy"],
      alternatives: ["FP&A"],
      subScores: {
        taskAutomation: 70,
        toolMaturity: 65,
        marketAdoption: 60,
        agenticExposure: 40,
      },
      confidence: 70,
    });
    const out = parseRiskJson(raw, title);
    expect(out).not.toBeNull();
    expect(out!.jobTitle).toBe("Accountant");
    expect(out!.riskScore).toBe(72);
    expect(out!.riskLevel).toBe("high"); // from score, ignores AI "low"
    expect(out!.source).toBe("ai");
    expect(out!.subScores?.taskAutomation).toBe(70);
  });

  it("rejects missing summary", () => {
    const raw = JSON.stringify({
      riskScore: 40,
      summary: "short",
      reasons: ["a"],
      skillsToBuild: ["b"],
    });
    expect(parseRiskJson(raw, title)).toBeNull();
  });

  it("rejects invalid score", () => {
    const raw = JSON.stringify({
      riskScore: 150,
      summary: "A sufficiently long summary for validation purposes here.",
      reasons: ["reason one"],
      skillsToBuild: ["skill one"],
    });
    expect(parseRiskJson(raw, title)).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseRiskJson("not json at all", title)).toBeNull();
  });

  it("parses fenced JSON", () => {
    const raw = `\`\`\`json
{
  "riskScore": 40,
  "summary": "A sufficiently long summary for validation purposes here.",
  "reasons": ["Reason one about the role"],
  "skillsToBuild": ["Skill one"]
}
\`\`\``;
    const out = parseRiskJson(raw, title);
    expect(out?.riskLevel).toBe("medium");
    expect(out?.jobTitle).toBe(title);
  });
});

describe("heuristicCareerRisk", () => {
  it("marks source heuristic and consistent level", () => {
    const h = heuristicCareerRisk("Frontend Developer", "React, TypeScript");
    expect(h.source).toBe("heuristic");
    expect(h.riskLevel).toBe(scoreToRiskLevel(h.riskScore));
    expect(h.jobTitle).toBe("Frontend Developer");
    expect(h.subScores).toBeDefined();
  });
});

describe("clampScore", () => {
  it("bounds values", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(200)).toBe(100);
    expect(clampScore(Number.NaN)).toBe(50);
  });
});
