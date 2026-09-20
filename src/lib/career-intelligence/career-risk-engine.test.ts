/**
 * Career risk engine tests — Phase 5 (multi-language quality gate).
 *
 * These tests validate:
 *  - Deterministic output for identical inputs
 *  - Different outputs for meaningfully different profiles
 *  - All seven supported locales produce non-empty natural output
 *  - RTL locales still produce non-empty output
 *  - No fabricated facts (no invented employers/degrees/metrics)
 *  - Anti-repetition: no adjacent identical reasons
 *  - No thrown errors on partial input
 */
import { describe, it, expect } from "vitest";
import { runCareerRiskEngine } from "./career-risk-engine";
import type { CareerRiskLocale } from "@/types/career-risk";

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

const ALL_LOCALES: CareerRiskLocale[] = [
  "en",
  "fa",
  "ar",
  "es",
  "fr",
  "de",
  "hi",
];

const ENGINEER_JUNIOR = {
  jobTitle: "Frontend Developer",
  skills: "React, TypeScript",
  experienceYears: 1,
  location: "Tehran",
  country: "Iran",
  locale: "en",
  responsibilities: "Built small features\nFixed UI bugs",
};

const ENGINEER_SENIOR = {
  jobTitle: "Frontend Developer",
  skills: "React, TypeScript, Next.js, system design",
  experienceYears: 9,
  location: "Berlin",
  country: "Germany",
  locale: "en",
  responsibilities:
    "Led the migration to Next.js\nMentored 4 engineers\nDesigned the design system",
};

const NURSE_SENIOR = {
  jobTitle: "Registered Nurse",
  skills: "patient care, triage, ICU",
  experienceYears: 8,
  location: "Munich",
  country: "Germany",
  locale: "en",
  responsibilities: "Provided ICU care\nCoordinated with physicians",
};

/* ------------------------------------------------------------------ */
/* Determinism                                                        */
/* ------------------------------------------------------------------ */

describe("career risk engine — determinism", () => {
  it("produces identical output for identical input", () => {
    const a = runCareerRiskEngine(ENGINEER_SENIOR);
    const b = runCareerRiskEngine(ENGINEER_SENIOR);
    expect(a.riskScore).toBe(b.riskScore);
    expect(a.riskLevel).toBe(b.riskLevel);
    expect(a.reasons).toEqual(b.reasons);
    expect(a.skillsToBuild).toEqual(b.skillsToBuild);
    expect(a.summary).toBe(b.summary);
  });

  it("never throws on partial input", () => {
    expect(() =>
      runCareerRiskEngine({ jobTitle: "X" }),
    ).not.toThrow();
    expect(() =>
      runCareerRiskEngine({ jobTitle: "" }),
    ).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Profile differentiation                                            */
/* ------------------------------------------------------------------ */

describe("career risk engine — profile differentiation", () => {
  it("junior vs senior engineer produce different summaries", () => {
    const j = runCareerRiskEngine(ENGINEER_JUNIOR);
    const s = runCareerRiskEngine(ENGINEER_SENIOR);
    expect(j.summary).not.toBe(s.summary);
    expect(j.riskScore).not.toBe(s.riskScore);
  });

  it("engineer vs nurse produce different reasons", () => {
    const e = runCareerRiskEngine(ENGINEER_SENIOR);
    const n = runCareerRiskEngine(NURSE_SENIOR);
    // Reasons are localized to their task families; overlap is not expected.
    const overlap = e.reasons.filter((r) => n.reasons.includes(r));
    expect(overlap.length).toBe(0);
  });

  it("different experience years shift the reasons", () => {
    const y1 = runCareerRiskEngine({ ...ENGINEER_SENIOR, experienceYears: 1 });
    const y9 = runCareerRiskEngine({ ...ENGINEER_SENIOR, experienceYears: 9 });
    expect(y1.summary).not.toBe(y9.summary);
  });
});

/* ------------------------------------------------------------------ */
/* Seven-language quality                                             */
/* ------------------------------------------------------------------ */

describe("career risk engine — seven languages", () => {
  it("produces non-empty summary for every locale", () => {
    for (const locale of ALL_LOCALES) {
      const r = runCareerRiskEngine({
        ...ENGINEER_SENIOR,
        locale,
      });
      expect(r.summary.length).toBeGreaterThan(20);
      expect(r.summary).not.toContain("{");
    }
  });

  it("produces at least 3 non-empty reasons for every locale", () => {
    for (const locale of ALL_LOCALES) {
      const r = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale });
      expect(r.reasons.length).toBeGreaterThanOrEqual(3);
      for (const reason of r.reasons) {
        expect(reason.length).toBeGreaterThan(10);
      }
    }
  });

  it("provides skillsToBuild for every locale", () => {
    for (const locale of ALL_LOCALES) {
      const r = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale });
      expect(r.skillsToBuild.length).toBeGreaterThan(0);
    }
  });

  it("RTL locales produce Persian/Arabic content (not English)", () => {
    const fa = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale: "fa" });
    const ar = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale: "ar" });

    // A coarse sanity check: the summaries should contain at least one
    // character from the Arabic block (U+0600–U+06FF) which covers both
    // Persian and Arabic. We do not assert specific words.
    const arabicRe = /[\u0600-\u06FF]/;
    expect(arabicRe.test(fa.summary)).toBe(true);
    expect(arabicRe.test(ar.summary)).toBe(true);
  });

  it("German output does not contain Persian or Arabic characters", () => {
    const de = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale: "de" });
    expect(/[\u0600-\u06FF]/.test(de.summary)).toBe(false);
  });

  it("Hindi output contains Devanagari characters", () => {
    const hi = runCareerRiskEngine({ ...ENGINEER_SENIOR, locale: "hi" });
    expect(/[\u0900-\u097F]/.test(hi.summary)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Anti-fabrication                                                   */
/* ------------------------------------------------------------------ */

describe("career risk engine — anti-fabrication", () => {
  it("does not invent degrees", () => {
    const r = runCareerRiskEngine(ENGINEER_SENIOR);
    const blob = `${r.summary} ${r.reasons.join(" ")}`;
    // We never invent a degree when the user did not supply education.
    expect(/\b(BSc|MSc|PhD|Bachelor|Master|Doctorate)\b/i.test(blob)).toBe(false);
  });

  it("does not invent companies", () => {
    const r = runCareerRiskEngine(ENGINEER_SENIOR);
    const blob = `${r.summary} ${r.reasons.join(" ")}`;
    // No "at <Company>" claims.
    expect(/\bworked at [A-Z][A-Za-z]+/.test(blob)).toBe(false);
  });

  it("does not invent metrics", () => {
    const r = runCareerRiskEngine({ ...ENGINEER_SENIOR, metrics: [] });
    const blob = `${r.summary} ${r.reasons.join(" ")}`;
    // A metric is only allowed if the user actually supplied one.
    // Here the user supplied none, so no "80 orders/day"-style claims.
    expect(/\b\d{2,}\s?(orders|users|customers|clients|projects)\b/i.test(blob)).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/* Anti-repetition                                                    */
/* ------------------------------------------------------------------ */

describe("career risk engine — anti-repetition", () => {
  it("reasons are unique within a single response", () => {
    const r = runCareerRiskEngine(ENGINEER_SENIOR);
    const normalized = r.reasons.map((x) => x.trim().toLowerCase());
    const unique = new Set(normalized);
    expect(unique.size).toBe(normalized.length);
  });
});

/* ------------------------------------------------------------------ */
/* Score bounds                                                       */
/* ------------------------------------------------------------------ */

describe("career risk engine — score bounds", () => {
  it("riskScore is within 0..100", () => {
    const r = runCareerRiskEngine(ENGINEER_SENIOR);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(100);
  });

  it("riskLevel is one of low/medium/high", () => {
    const r = runCareerRiskEngine(ENGINEER_SENIOR);
    expect(["low", "medium", "high"]).toContain(r.riskLevel);
  });
});
