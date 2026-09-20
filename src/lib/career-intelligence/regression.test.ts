/**
 * Regression tests — Phase 7.
 *
 * Guarantees that the Phase 1–6 refactor did not break:
 *  1. Legacy exports still exist with compatible signatures.
 *  2. Legacy output shapes still match what the UI/API expects.
 *  3. Determinism still holds after the refactor.
 *  4. All seven locales still produce valid output through the OLD
 *     entry points.
 *
 * These tests are intentionally narrow: they do NOT re-test the new
 * engines in depth (Phase 5 covers that). They only assert that the
 * pre-existing public surface still behaves the way it did.
 */
import { describe, it, expect } from "vitest";

/* ------------------------------------------------------------------ */
/* Legacy imports — must all still resolve and be callable            */
/* ------------------------------------------------------------------ */

import {
  heuristicCareerRisk,
  toSuccessResponse,
  normalizeCareerLocale,
  scoreToRiskLevel,
  clampScore,
} from "@/lib/career-risk";

import {
  buildTemplateResume,
  chatCompletion,
  chatCompletionWithMeta,
  AI_TOTAL_BUDGET_MS,
  AI_PER_ATTEMPT_MS,
} from "@/lib/ai";

import { buildOfflineMigration } from "@/lib/career-intelligence/offline-migration";

/* ------------------------------------------------------------------ */
/* Legacy exports exist                                               */
/* ------------------------------------------------------------------ */

describe("regression — legacy exports", () => {
  it("heuristicCareerRisk is callable with the old signature", () => {
    const result = heuristicCareerRisk("Software Engineer", "React", {
      industry: "Software",
      experienceYears: 5,
      country: "Germany",
      location: "Berlin",
      education: "BSc",
      locale: "en",
    });
    expect(result).toBeDefined();
    expect(typeof result.riskScore).toBe("number");
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(Array.isArray(result.skillsToBuild)).toBe(true);
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.source).toBe("heuristic");
  });

  it("heuristicCareerRisk works without the optional 'extra' argument", () => {
    const result = heuristicCareerRisk("Nurse");
    expect(result).toBeDefined();
    expect(result.source).toBe("heuristic");
  });

  it("buildTemplateResume returns a string (legacy shape)", () => {
    const text = buildTemplateResume({
      fullName: "Jane Doe",
      email: "jane@example.com",
      targetRole: "Frontend Developer",
      skills: "React, TypeScript",
      experience: "Built a design system",
      education: "BSc Computer Science",
      languages: "English",
    });
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    // The contact email should appear in the header.
    expect(text).toContain("jane@example.com");
  });

  it("buildOfflineMigration is callable with the old signature", () => {
    const result = buildOfflineMigration({
      jobTitle: "Backend Engineer",
      skills: "Python, Django",
      experienceYears: 6,
      country: "Iran",
      location: "Tehran",
      locale: "en",
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.countries)).toBe(true);
    expect(Array.isArray(result.caveats)).toBe(true);
    expect(result.source).toBe("heuristic");
  });

  it("AI budget constants are still exported", () => {
    expect(typeof AI_TOTAL_BUDGET_MS).toBe("number");
    expect(typeof AI_PER_ATTEMPT_MS).toBe("number");
    expect(AI_TOTAL_BUDGET_MS).toBeGreaterThan(0);
    expect(AI_PER_ATTEMPT_MS).toBeGreaterThan(0);
  });

  it("chatCompletion functions still exist", () => {
    expect(typeof chatCompletion).toBe("function");
    expect(typeof chatCompletionWithMeta).toBe("function");
  });
});

/* ------------------------------------------------------------------ */
/* Legacy output shapes                                               */
/* ------------------------------------------------------------------ */

describe("regression — legacy output shapes", () => {
  it("heuristicCareerRisk output matches CareerRiskAnalysis shape", () => {
    const r = heuristicCareerRisk("Software Engineer", "React", {
      experienceYears: 5,
      locale: "en",
    });
    expect(typeof r.jobTitle).toBe("string");
    expect(typeof r.riskScore).toBe("number");
    expect(["low", "medium", "high"]).toContain(r.riskLevel);
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.reasons)).toBe(true);
    expect(Array.isArray(r.skillsToBuild)).toBe(true);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.source).toBe("heuristic");
    expect(r.confidenceSource).toBe("offline_estimate");
  });

  it("toSuccessResponse wraps the analysis with the legacy shape", () => {
    const analysis = heuristicCareerRisk("Software Engineer", "React", {
      experienceYears: 5,
      locale: "en",
    });
    const response = toSuccessResponse({
      analysis,
      paid: false,
      assessmentId: "test-id",
      shareToken: "share-token",
      locale: "en",
    });
    expect(response.success).toBe(true);
    expect(response.paid).toBe(false);
    expect(response.alternativesLocked).toBe(true);
    expect(typeof response.message).toBe("string");
    expect(response.assessmentId).toBe("test-id");
    expect(response.shareToken).toBe("share-token");
    expect(typeof response.sharePath).toBe("string");
    expect(typeof response.jobTitle).toBe("string");
    expect(typeof response.riskScore).toBe("number");
    expect(typeof response.summary).toBe("string");
    expect(Array.isArray(response.reasons)).toBe(true);
  });

  it("toSuccessResponse hides alternatives for free users", () => {
    const analysis = heuristicCareerRisk("Software Engineer", "React", {
      experienceYears: 5,
      locale: "en",
    });
    const free = toSuccessResponse({
      analysis,
      paid: false,
      locale: "en",
    });
    const paid = toSuccessResponse({
      analysis,
      paid: true,
      locale: "en",
    });
    expect(free.alternatives).toEqual([]);
    expect(free.alternativesLocked).toBe(true);
    expect(Array.isArray(paid.alternatives)).toBe(true);
    expect(paid.alternativesLocked).toBe(false);
  });

  it("buildOfflineMigration output matches OfflineMigration shape", () => {
    const r = buildOfflineMigration({
      jobTitle: "Nurse",
      experienceYears: 3,
      locale: "en",
    });
    expect(typeof r.title).toBe("string");
    expect(typeof r.summary).toBe("string");
    expect(Array.isArray(r.countries)).toBe(true);
    expect(Array.isArray(r.caveats)).toBe(true);
    expect(r.source).toBe("heuristic");

    for (const c of r.countries) {
      expect(typeof c.country).toBe("string");
      expect(typeof c.demand).toBe("string");
      expect(typeof c.pathway).toBe("string");
      expect(typeof c.notes).toBe("string");
    }
  });
});

/* ------------------------------------------------------------------ */
/* Utility functions preserved                                        */
/* ------------------------------------------------------------------ */

describe("regression — utility functions", () => {
  it("normalizeCareerLocale still recognizes the seven locales", () => {
    expect(normalizeCareerLocale("en")).toBe("en");
    expect(normalizeCareerLocale("fa")).toBe("fa");
    expect(normalizeCareerLocale("ar")).toBe("ar");
    expect(normalizeCareerLocale("es")).toBe("es");
    expect(normalizeCareerLocale("fr")).toBe("fr");
    expect(normalizeCareerLocale("de")).toBe("de");
    expect(normalizeCareerLocale("hi")).toBe("hi");
    expect(normalizeCareerLocale("xx")).toBe("en");
    expect(normalizeCareerLocale(null)).toBe("en");
    expect(normalizeCareerLocale(undefined)).toBe("en");
  });

  it("clampScore still clamps to 0..100", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(50.4)).toBe(50);
    expect(clampScore(NaN)).toBe(50);
  });

  it("scoreToRiskLevel still maps the expected thresholds", () => {
    expect(scoreToRiskLevel(10)).toBe("low");
    expect(scoreToRiskLevel(34)).toBe("low");
    expect(scoreToRiskLevel(35)).toBe("medium");
    expect(scoreToRiskLevel(64)).toBe("medium");
    expect(scoreToRiskLevel(65)).toBe("high");
    expect(scoreToRiskLevel(100)).toBe("high");
  });
});

/* ------------------------------------------------------------------ */
/* Seven-language stability through legacy entry points               */
/* ------------------------------------------------------------------ */

describe("regression — seven-language stability via legacy entry points", () => {
  const locales = ["en", "fa", "ar", "es", "fr", "de", "hi"] as const;

  it("heuristicCareerRisk returns non-empty output for every locale", () => {
    for (const locale of locales) {
      const r = heuristicCareerRisk("Software Engineer", "React", {
        experienceYears: 5,
        locale,
      });
      expect(r.summary.length).toBeGreaterThan(20);
      expect(r.reasons.length).toBeGreaterThanOrEqual(3);
      expect(r.skillsToBuild.length).toBeGreaterThan(0);
    }
  });

  it("buildTemplateResume returns a non-empty string for every locale", () => {
    for (const locale of locales) {
      const text = buildTemplateResume({
        fullName: "Jane Doe",
        email: "jane@example.com",
        targetRole: "Frontend Developer",
        skills: "React, TypeScript",
        experience: "Built a design system",
        education: "BSc Computer Science",
        languages: "English",
      });
      // Note: buildTemplateResume does not take a locale — it should
      // still produce a valid string.
      expect(text.length).toBeGreaterThan(50);
    }
  });

  it("buildOfflineMigration returns non-empty output for every locale", () => {
    for (const locale of locales) {
      const r = buildOfflineMigration({
        jobTitle: "Software Engineer",
        skills: "TypeScript",
        experienceYears: 5,
        locale,
      });
      expect(r.summary.length).toBeGreaterThan(20);
      expect(r.countries.length).toBeGreaterThan(0);
      expect(r.caveats.length).toBeGreaterThanOrEqual(2);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Determinism through legacy entry points                            */
/* ------------------------------------------------------------------ */

describe("regression — determinism via legacy entry points", () => {
  it("heuristicCareerRisk is deterministic", () => {
    const a = heuristicCareerRisk("Software Engineer", "React", {
      experienceYears: 5,
      locale: "en",
    });
    const b = heuristicCareerRisk("Software Engineer", "React", {
      experienceYears: 5,
      locale: "en",
    });
    expect(a.summary).toBe(b.summary);
    expect(a.reasons).toEqual(b.reasons);
    expect(a.riskScore).toBe(b.riskScore);
  });

  it("buildOfflineMigration is deterministic", () => {
    const a = buildOfflineMigration({
      jobTitle: "Nurse",
      experienceYears: 5,
      locale: "en",
    });
    const b = buildOfflineMigration({
      jobTitle: "Nurse",
      experienceYears: 5,
      locale: "en",
    });
    expect(a.countries.map((c) => c.country)).toEqual(
      b.countries.map((c) => c.country),
    );
  });

  it("buildTemplateResume is deterministic", () => {
    const input = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      targetRole: "Frontend Developer",
      skills: "React",
      experience: "Built a design system",
    };
    expect(buildTemplateResume(input)).toBe(buildTemplateResume(input));
  });
});

/* ------------------------------------------------------------------ */
/* Endpoint-call safety                                               */
/* ------------------------------------------------------------------ */

describe("regression — endpoint-call safety", () => {
  it("heuristicCareerRisk never throws for edge-case inputs", () => {
    const cases: Array<[string, string | undefined, Parameters<typeof heuristicCareerRisk>[2]]> = [
      ["", undefined, undefined],
      ["X", "", undefined],
      ["X", "Y", {}],
      ["X", "Y", { locale: "invalid" }],
      ["X", "Y", { locale: "fa" }],
      ["X", "Y", { experienceYears: -5 }],
      ["X", "Y", { experienceYears: 999 }],
    ];
    for (const [title, skills, extra] of cases) {
      expect(() => heuristicCareerRisk(title, skills, extra)).not.toThrow();
    }
  });

  it("buildOfflineMigration never throws for edge-case inputs", () => {
    const cases: Array<Record<string, unknown>> = [
      { jobTitle: "" },
      { jobTitle: "X" },
      { jobTitle: "X", locale: "invalid" },
      { jobTitle: "X", experienceYears: -1 },
      { jobTitle: "X", experienceYears: 999 },
    ];
    for (const input of cases) {
      expect(() =>
        buildOfflineMigration(input as never),
      ).not.toThrow();
    }
  });

  it("buildTemplateResume never throws for edge-case inputs", () => {
    const cases: Array<Record<string, unknown>> = [
      { fullName: "" },
      { fullName: "X" },
      { fullName: "X", email: "" },
      { fullName: "X", skills: "" },
    ];
    for (const input of cases) {
      expect(() =>
        buildTemplateResume(input as never),
      ).not.toThrow();
    }
  });
});
