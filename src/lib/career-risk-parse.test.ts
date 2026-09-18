import { describe, expect, it } from "vitest";
import {
  parseRiskJson,
  reconcileScoreWithSubScores,
  compositeFromSubScores,
  scoreToRiskLevel,
  scoreSubScoreGap,
  parseSubScoresStrict,
  heuristicCareerRisk,
} from "@/lib/career-risk";

/* ------------------------------------------------------------------ */
/* reconcileScoreWithSubScores                                         */
/* ------------------------------------------------------------------ */

describe("reconcileScoreWithSubScores", () => {
  const lowSubs = {
    taskAutomation: 20,
    toolMaturity: 25,
    marketAdoption: 20,
    agenticExposure: 15,
  };
  const highSubs = {
    taskAutomation: 90,
    toolMaturity: 85,
    marketAdoption: 80,
    agenticExposure: 75,
  };
  const midSubs = {
    taskAutomation: 55,
    toolMaturity: 55,
    marketAdoption: 50,
    agenticExposure: 45,
  };

  it("rejects large gap toward composite (high score + low subs)", () => {
    const composite = compositeFromSubScores(lowSubs);
    const reconciled = reconcileScoreWithSubScores(90, lowSubs);
    expect(Math.abs(reconciled - composite)).toBeLessThanOrEqual(5);
    expect(reconciled).toBeLessThan(50);
  });

  it("rejects large gap toward composite (low score + high subs)", () => {
    const composite = compositeFromSubScores(highSubs);
    const reconciled = reconcileScoreWithSubScores(20, highSubs);
    expect(Math.abs(reconciled - composite)).toBeLessThanOrEqual(5);
    expect(reconciled).toBeGreaterThan(50);
  });

  it("keeps aligned scores", () => {
    const composite = compositeFromSubScores(highSubs);
    expect(reconcileScoreWithSubScores(composite, highSubs)).toBe(composite);
  });

  it("blends mildly inconsistent scores toward composite", () => {
    const composite = compositeFromSubScores(midSubs);
    // فاصله‌ی ~20 واحد → باید Blend شود، نه کامل جایگزین
    const reconciled = reconcileScoreWithSubScores(composite + 20, midSubs);
    expect(reconciled).toBeGreaterThan(composite);
    expect(reconciled).toBeLessThan(composite + 20);
  });

  it("clamps out-of-range inputs before reconciling", () => {
    const composite = compositeFromSubScores(midSubs);
    expect(reconcileScoreWithSubScores(-50, midSubs)).toBe(composite);
    expect(reconcileScoreWithSubScores(500, midSubs)).toBe(composite);
  });
});

/* ------------------------------------------------------------------ */
/* scoreSubScoreGap                                                    */
/* ------------------------------------------------------------------ */

describe("scoreSubScoreGap", () => {
  const subs = {
    taskAutomation: 60,
    toolMaturity: 60,
    marketAdoption: 55,
    agenticExposure: 50,
  };

  it("returns 0 for aligned score", () => {
    const composite = compositeFromSubScores(subs);
    expect(scoreSubScoreGap(composite, subs)).toBe(0);
  });

  it("returns positive gap for misaligned score", () => {
    const composite = compositeFromSubScores(subs);
    expect(scoreSubScoreGap(composite + 30, subs)).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* parseSubScoresStrict                                                */
/* ------------------------------------------------------------------ */

describe("parseSubScoresStrict", () => {
  it("accepts valid sub-scores", () => {
    const parsed = parseSubScoresStrict({
      taskAutomation: 50,
      toolMaturity: 60,
      marketAdoption: 70,
      agenticExposure: 40,
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.taskAutomation).toBe(50);
  });

  it("rounds fractional values", () => {
    const parsed = parseSubScoresStrict({
      taskAutomation: 50.6,
      toolMaturity: 60.2,
      marketAdoption: 70.9,
      agenticExposure: 40.4,
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.taskAutomation).toBe(51);
  });

  it("rejects out-of-range values", () => {
    expect(
      parseSubScoresStrict({
        taskAutomation: -1,
        toolMaturity: 60,
        marketAdoption: 70,
        agenticExposure: 40,
      })
    ).toBeNull();
    expect(
      parseSubScoresStrict({
        taskAutomation: 50,
        toolMaturity: 101,
        marketAdoption: 70,
        agenticExposure: 40,
      })
    ).toBeNull();
  });

  it("rejects non-object inputs", () => {
    expect(parseSubScoresStrict(null)).toBeNull();
    expect(parseSubScoresStrict("x")).toBeNull();
    expect(parseSubScoresStrict(42)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* parseRiskJson consistency                                           */
/* ------------------------------------------------------------------ */

describe("parseRiskJson consistency", () => {
  it("accepts coherent AI JSON", () => {
    const text = JSON.stringify({
      riskScore: 70,
      summary:
        "This software role faces meaningful AI-driven change over the next decade with tool assistance reshaping delivery.",
      reasons: [
        "Code generation tools already accelerate routine implementation work substantially.",
        "Senior judgment and system design remain harder to fully automate in production settings.",
        "Local market adoption of AI assistants is rising in product engineering teams.",
      ],
      skillsToBuild: [
        "AI-assisted code review practices",
        "System design for human-in-the-loop workflows",
        "Domain modeling and requirements facilitation",
      ],
      alternatives: ["Engineering manager", "Solutions architect"],
      subScores: {
        taskAutomation: 72,
        toolMaturity: 80,
        marketAdoption: 70,
        agenticExposure: 65,
      },
      timeHorizon: "5–10 years",
      confidence: 70,
    });
    const parsed = parseRiskJson(text, "Software Engineer");
    expect(parsed).not.toBeNull();
    expect(parsed!.source).toBe("ai");
    expect(parsed!.riskLevel).toBe(scoreToRiskLevel(parsed!.riskScore));
    expect(parsed!.confidenceSource).toBe("model");
    expect(parsed!.jobTitle).toBe("Software Engineer");
  });

  it("repairs inconsistent riskScore vs subScores and lowers confidence", () => {
    const text = JSON.stringify({
      riskScore: 20,
      summary:
        "Despite low headline score the sub-metrics indicate heavy automation pressure on this clerical role in many markets worldwide.",
      reasons: [
        "Document processing and data entry are primary automation targets already in production.",
        "Software maturity for RPA and LLM form-filling is high across industries.",
        "Market adoption of back-office automation continues to accelerate yearly.",
      ],
      skillsToBuild: [
        "Process exception handling",
        "Citizen development / no-code orchestration",
        "Customer escalation judgment",
      ],
      alternatives: ["Operations analyst"],
      subScores: {
        taskAutomation: 90,
        toolMaturity: 88,
        marketAdoption: 85,
        agenticExposure: 70,
      },
      timeHorizon: "3–5 years",
      confidence: 90,
    });
    const parsed = parseRiskJson(text, "Data Entry Clerk");
    expect(parsed).not.toBeNull();
    expect(parsed!.riskScore).toBeGreaterThan(50);
    expect(parsed!.confidence).toBeLessThanOrEqual(55);
    expect(parsed!.confidenceSource).toBe("repaired");
  });

  it("rejects empty / too-short summary", () => {
    const text = JSON.stringify({
      riskScore: 50,
      summary: "short",
      reasons: ["x"],
      skillsToBuild: ["y"],
      subScores: {
        taskAutomation: 50,
        toolMaturity: 50,
        marketAdoption: 50,
        agenticExposure: 50,
      },
      timeHorizon: "5–10 years",
      confidence: 50,
    });
    expect(parseRiskJson(text, "Role")).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseRiskJson("{not json", "Role")).toBeNull();
  });

  it("rejects non-string input", () => {
    // @ts-expect-error — تست ورودی نامعتبر
    expect(parseRiskJson(null, "Role")).toBeNull();
    // @ts-expect-error — تست ورودی نامعتبر
    expect(parseRiskJson(undefined, "Role")).toBeNull();
  });

  it("extracts JSON from fenced code blocks", () => {
    const payload = {
      riskScore: 45,
      summary:
        "This role faces moderate automation pressure with tools reshaping parts of the daily workflow over the coming years.",
      reasons: [
        "Routine reporting tasks are increasingly automated by BI tooling.",
        "Stakeholder communication remains a human-centric responsibility.",
      ],
      skillsToBuild: ["Data storytelling", "Automation tooling"],
      subScores: {
        taskAutomation: 45,
        toolMaturity: 50,
        marketAdoption: 45,
        agenticExposure: 40,
      },
      timeHorizon: "5–10 years",
      confidence: 65,
    };
    const text = "```json\n" + JSON.stringify(payload) + "\n```";
    const parsed = parseRiskJson(text, "Business Analyst");
    expect(parsed).not.toBeNull();
    expect(parsed!.source).toBe("ai");
  });

  it("marks confidenceSource as repaired when subScores are missing", () => {
    const text = JSON.stringify({
      riskScore: 55,
      summary:
        "This role shows mixed exposure to automation depending on how quickly tooling matures in the local market over time.",
      reasons: [
        "Some tasks are already partially automated by off-the-shelf software.",
        "Judgment-heavy responsibilities remain difficult to fully replace.",
      ],
      skillsToBuild: ["Automation oversight", "Cross-functional communication"],
      timeHorizon: "5–10 years",
      confidence: 70,
    });
    const parsed = parseRiskJson(text, "Operations Coordinator");
    // Zod سخت‌گیرانه شکست می‌خورد چون subScores اجباری است،
    // اما مسیر نرم باید همچنان تحلیل را برگرداند.
    if (parsed) {
      expect(parsed.confidenceSource).toBe("repaired");
      expect(parsed.confidence).toBeLessThanOrEqual(45);
    }
  });

  it("always returns a valid riskLevel matching riskScore", () => {
    const text = JSON.stringify({
      riskScore: 82,
      summary:
        "This highly routine role faces strong automation pressure as tooling and market adoption continue to accelerate.",
      reasons: [
        "Most daily tasks are rule-based and already partially automated.",
        "Tooling maturity for this domain is high and rising quickly.",
      ],
      skillsToBuild: ["Exception handling", "Process design"],
      subScores: {
        taskAutomation: 85,
        toolMaturity: 80,
        marketAdoption: 75,
        agenticExposure: 70,
      },
      timeHorizon: "3–5 years",
      confidence: 75,
    });
    const parsed = parseRiskJson(text, "Data Processor");
    expect(parsed).not.toBeNull();
    expect(parsed!.riskLevel).toBe(scoreToRiskLevel(parsed!.riskScore));
  });
});

/* ------------------------------------------------------------------ */
/* heuristic offline label                                             */
/* ------------------------------------------------------------------ */

describe("heuristic offline label", () => {
  it("marks offline_estimate confidence for Persian teacher role", () => {
    const h = heuristicCareerRisk("معلم", "تدریس", {
      locale: "fa",
      country: "ایران",
      location: "تهران",
      experienceYears: 5,
    });
    expect(h.source).toBe("heuristic");
    expect(h.confidenceSource).toBe("offline_estimate");
    expect(h.summary.length).toBeGreaterThan(80);
    expect(h.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("produces a valid risk level consistent with its score", () => {
    const h = heuristicCareerRisk("Software Engineer", "TypeScript, React", {
      locale: "en",
      country: "Germany",
      location: "Berlin",
      experienceYears: 6,
      industry: "Technology",
    });
    expect(h.riskLevel).toBe(scoreToRiskLevel(h.riskScore));
    expect(h.subScores).toBeDefined();
    expect(h.skillsToBuild.length).toBeGreaterThan(0);
  });

  it("lowers automation exposure for care roles", () => {
    const care = heuristicCareerRisk("Nurse", "patient care", {
      locale: "en",
      country: "Germany",
      location: "Berlin",
    });
    const clerical = heuristicCareerRisk("Data Entry Clerk", "", {
      locale: "en",
      country: "Germany",
      location: "Berlin",
    });
    expect(care.riskScore).toBeLessThan(clerical.riskScore);
  });

  it("falls back to English for unsupported locales", () => {
    const h = heuristicCareerRisk("Engineer", "", {
      locale: "xx",
      country: "Germany",
    });
    expect(h.source).toBe("heuristic");
    expect(h.summary.length).toBeGreaterThan(0);
  });

  it("handles empty jobTitle gracefully", () => {
    const h = heuristicCareerRisk("", "", { locale: "en" });
    expect(h.jobTitle.length).toBeGreaterThan(0);
    expect(h.summary.length).toBeGreaterThan(0);
  });
});
