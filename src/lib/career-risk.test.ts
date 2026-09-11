import { describe, expect, it } from "vitest";
import {
  heuristicCareerRisk,
  parseRiskJson,
  scoreToRiskLevel,
  toSuccessResponse,
} from "@/lib/career-risk";

describe("scoreToRiskLevel", () => {
  it("maps bands", () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(34)).toBe("low");
    expect(scoreToRiskLevel(35)).toBe("medium");
    expect(scoreToRiskLevel(64)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(100)).toBe("high");
  });
});

describe("parseRiskJson", () => {
  it("forces user title and level from score", () => {
    const text = JSON.stringify({
      jobTitle: "HACKED TITLE",
      riskScore: 80,
      riskLevel: "low",
      summary: "Meaningful summary about automation pressure in this role over time.",
      reasons: ["r1"],
      skillsToBuild: ["s1"],
      alternatives: ["a1"],
      subScores: {
        taskAutomation: 70,
        toolMaturity: 60,
        marketAdoption: 55,
        agenticExposure: 40,
      },
    });
    const parsed = parseRiskJson(text, "Frontend Developer");
    expect(parsed).not.toBeNull();
    expect(parsed!.jobTitle).toBe("Frontend Developer");
    expect(parsed!.riskLevel).toBe("high");
    expect(parsed!.source).toBe("ai");
  });

  it("returns null on garbage", () => {
    expect(parseRiskJson("not json", "X")).toBeNull();
  });
});

describe("heuristicCareerRisk", () => {
  it("marks source heuristic", () => {
    const h = heuristicCareerRisk("Data Entry Clerk");
    expect(h.source).toBe("heuristic");
    expect(h.riskLevel).toBe(scoreToRiskLevel(h.riskScore));
  });
});

describe("toSuccessResponse", () => {
  it("locks alternatives for free", () => {
    const analysis = heuristicCareerRisk("Nurse");
    const free = toSuccessResponse({ analysis, paid: false });
    expect(free.alternativesLocked).toBe(true);
    expect(free.alternatives).toEqual([]);
    const paid = toSuccessResponse({ analysis, paid: true });
    expect(paid.alternatives.length).toBeGreaterThan(0);
  });
});
