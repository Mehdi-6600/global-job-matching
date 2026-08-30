import { describe, it, expect } from "vitest";
import {
  heuristicCareerRisk,
  parseRiskJson,
  isPaidPlan,
} from "./career-risk";

describe("heuristicCareerRisk", () => {
  it("marks high-risk roles higher", () => {
    const r = heuristicCareerRisk("Data Entry Clerk");
    expect(r.riskScore).toBeGreaterThanOrEqual(70);
    expect(r.riskLevel).toBe("high");
    expect(r.source).toBe("heuristic");
  });

  it("marks low-risk care roles lower", () => {
    const r = heuristicCareerRisk("Nurse");
    expect(r.riskScore).toBeLessThan(40);
    expect(r.riskLevel).toBe("low");
  });

  it("gives medium default for unknown titles", () => {
    const r = heuristicCareerRisk("Something Unique Role XYZ");
    expect(r.riskScore).toBe(55);
    expect(r.riskLevel).toBe("medium");
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("treats software developer as moderate", () => {
    const r = heuristicCareerRisk("Software Developer");
    expect(r.riskScore).toBe(45);
    expect(r.riskLevel).toBe("medium");
  });
});

describe("parseRiskJson", () => {
  it("parses valid AI JSON payload", () => {
    const raw = JSON.stringify({
      jobTitle: "Analyst",
      riskScore: 62,
      riskLevel: "medium",
      summary: "Some summary",
      reasons: ["a", "b"],
      skillsToBuild: ["x"],
      alternatives: ["y"],
    });
    const r = parseRiskJson(raw, "Fallback");
    expect(r).not.toBeNull();
    expect(r!.jobTitle).toBe("Analyst");
    expect(r!.riskScore).toBe(62);
    expect(r!.source).toBe("ai");
  });

  it("extracts JSON from surrounding text", () => {
    const raw = 'Here is analysis:\n{"jobTitle":"Dev","riskScore":40,"summary":"ok","reasons":[],"skillsToBuild":[],"alternatives":[]}\nThanks';
    const r = parseRiskJson(raw, "Fallback");
    expect(r?.jobTitle).toBe("Dev");
    expect(r?.riskScore).toBe(40);
  });

  it("returns null on invalid input", () => {
    expect(parseRiskJson("not json", "X")).toBeNull();
    expect(parseRiskJson("", "X")).toBeNull();
  });

  it("clamps out-of-range scores", () => {
    const raw = JSON.stringify({
      jobTitle: "A",
      riskScore: 999,
      summary: "",
      reasons: [],
      skillsToBuild: [],
      alternatives: [],
    });
    expect(parseRiskJson(raw, "A")!.riskScore).toBe(100);
  });
});

describe("isPaidPlan", () => {
  it("treats free/empty as not paid", () => {
    expect(isPaidPlan(null)).toBe(false);
    expect(isPaidPlan(undefined)).toBe(false);
    expect(isPaidPlan("")).toBe(false);
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("FREE")).toBe(false);
  });

  it("treats other plans as paid", () => {
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("business")).toBe(true);
    expect(isPaidPlan("enterprise")).toBe(true);
  });
});
