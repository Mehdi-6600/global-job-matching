import { describe, expect, it } from "vitest";
import {
  compositeFromSubScores,
  heuristicCareerRisk,
  parseRiskJson,
  parseSubScoresStrict,
  reconcileScoreWithSubScores,
  scoreToRiskLevel,
  toSuccessResponse,
  normalizeCareerLocale,
  languageNameForPrompt,
} from "@/lib/career-risk";

describe("scoreToRiskLevel", () => {
  it("maps bands deterministically", () => {
    expect(scoreToRiskLevel(0)).toBe("low");
    expect(scoreToRiskLevel(34)).toBe("low");
    expect(scoreToRiskLevel(35)).toBe("medium");
    expect(scoreToRiskLevel(64)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(100)).toBe("high");
  });
});

describe("normalizeCareerLocale", () => {
  it("accepts all 7 product locales", () => {
    for (const loc of ["en", "es", "ar", "fa", "hi", "fr", "de"] as const) {
      expect(normalizeCareerLocale(loc)).toBe(loc);
      expect(languageNameForPrompt(loc).length).toBeGreaterThan(2);
    }
  });
  it("falls back to en", () => {
    expect(normalizeCareerLocale("xx")).toBe("en");
    expect(normalizeCareerLocale(undefined)).toBe("en");
  });
});

describe("parseSubScoresStrict", () => {
  it("rejects missing fields", () => {
    expect(parseSubScoresStrict({ taskAutomation: 10 })).toBeNull();
  });
  it("rejects out of range", () => {
    expect(
      parseSubScoresStrict({
        taskAutomation: 101,
        toolMaturity: 10,
        marketAdoption: 10,
        agenticExposure: 10,
      })
    ).toBeNull();
  });
  it("accepts valid", () => {
    const s = parseSubScoresStrict({
      taskAutomation: 40,
      toolMaturity: 50,
      marketAdoption: 30,
      agenticExposure: 20,
    });
    expect(s).not.toBeNull();
    expect(s!.taskAutomation).toBe(40);
  });
});

describe("parseRiskJson", () => {
  it("forces user title and level from score", () => {
    const text = JSON.stringify({
      jobTitle: "HACKED TITLE",
      riskScore: 80,
      riskLevel: "low",
      summary:
        "Meaningful summary about automation pressure in this role over time.",
      reasons: ["r1"],
      skillsToBuild: ["s1"],
      alternatives: ["a1"],
      subScores: {
        taskAutomation: 70,
        toolMaturity: 60,
        marketAdoption: 55,
        agenticExposure: 40,
      },
      timeHorizon: "5–10 years",
      confidence: 70,
    });
    const parsed = parseRiskJson(text, "Frontend Developer");
    expect(parsed).not.toBeNull();
    expect(parsed!.jobTitle).toBe("Frontend Developer");
    expect(parsed!.riskLevel).toBe(scoreToRiskLevel(parsed!.riskScore));
    expect(parsed!.source).toBe("ai");
  });

  it("rejects missing subScores", () => {
    const text = JSON.stringify({
      riskScore: 50,
      summary: "A long enough summary text here for validation.",
      reasons: ["r1"],
      skillsToBuild: ["s1"],
      timeHorizon: "5–10 years",
      confidence: 50,
    });
    expect(parseRiskJson(text, "X")).toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseRiskJson("not json", "X")).toBeNull();
  });
});

describe("compositeFromSubScores", () => {
  it("is deterministic weighted average", () => {
    const score = compositeFromSubScores({
      taskAutomation: 100,
      toolMaturity: 0,
      marketAdoption: 0,
      agenticExposure: 0,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("reconcileScoreWithSubScores", () => {
  it("keeps score close to composite", () => {
    const sub = {
      taskAutomation: 50,
      toolMaturity: 50,
      marketAdoption: 50,
      agenticExposure: 50,
    };
    const reconciled = reconcileScoreWithSubScores(90, sub);
    expect(
      Math.abs(reconciled - compositeFromSubScores(sub))
    ).toBeLessThanOrEqual(15);
  });
});

describe("heuristicCareerRisk multilingual", () => {
  const locales = ["en", "es", "ar", "fa", "hi", "fr", "de"] as const;

  it("returns structured analysis for each locale", () => {
    for (const locale of locales) {
      const result = heuristicCareerRisk("Software Engineer", "TypeScript", {
        location: "Berlin",
        country: "Germany",
        locale,
      });
      expect(result.jobTitle).toBe("Software Engineer");
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(["low", "medium", "high"]).toContain(result.riskLevel);
      expect(result.summary.length).toBeGreaterThan(5);
      expect(result.timeHorizon).toBeTruthy();
      expect(result.source).toBe("heuristic");
      expect(result.skillsToBuild.length).toBeGreaterThan(0);
    }
  });

  it("uses Persian copy for fa locale", () => {
    const fa = heuristicCareerRisk("لوله‌کش", "تعمیرات", {
      location: "مشهد",
      country: "ایران",
      locale: "fa",
    });
    expect(fa.jobTitle).toBe("لوله‌کش");
    expect(fa.timeHorizon).toContain("سال");
  });

  it("uses Spanish copy for es locale", () => {
    const es = heuristicCareerRisk("Contable", "Excel", { locale: "es" });
    expect(es.timeHorizon).toContain("años");
  });

  it("uses German copy for de locale", () => {
    const de = heuristicCareerRisk("Krankenpfleger", "Pflege", {
      locale: "de",
    });
    expect(de.timeHorizon).toContain("Jahre");
  });
});

describe("toSuccessResponse", () => {
  it("localizes upgrade message for all locales", () => {
    const analysis = heuristicCareerRisk("Nurse", "patient care", {
      locale: "en",
    });
    for (const locale of ["en", "es", "ar", "fa", "hi", "fr", "de"] as const) {
      const res = toSuccessResponse({
        analysis,
        paid: false,
        locale,
      });
      expect(res.message).toBeTruthy();
      expect(res.message!.length).toBeGreaterThan(10);
    }
    const paid = toSuccessResponse({ analysis, paid: true, locale: "en" });
    expect(paid.message).toBeUndefined();
  });
});
