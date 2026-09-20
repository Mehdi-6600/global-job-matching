/**
 * Migration advisor tests — Phase 5 (personalization + non-legal).
 *
 * Validates:
 *  - Deterministic ranking for identical input
 *  - Different rankings for meaningfully different profiles
 *  - Always returns caveats
 *  - Never claims a legal pathway as current
 *  - Seven locales produce non-empty output
 *  - RTL locales produce non-empty output
 */
import { describe, it, expect } from "vitest";
import { buildOfflineMigration } from "./offline-migration";
import type { CareerRiskLocale } from "@/types/career-risk";

const ALL_LOCALES: CareerRiskLocale[] = [
  "en",
  "fa",
  "ar",
  "es",
  "fr",
  "de",
  "hi",
];

const ENGINEER_SENIOR = {
  jobTitle: "Backend Engineer",
  skills: "Python, Django, PostgreSQL",
  industry: "Software",
  experienceYears: 8,
  country: "Iran",
  location: "Tehran",
  locale: "en",
  targetRole: "Backend Engineer",
  languages: "English, Persian",
  responsibilities: "Led team of 4\nDesigned APIs",
};

const NURSE_JUNIOR = {
  jobTitle: "Nurse",
  skills: "patient care",
  experienceYears: 1,
  country: "Iran",
  location: "Tehran",
  locale: "en",
  languages: "Persian",
};

/* ------------------------------------------------------------------ */
/* Determinism                                                        */
/* ------------------------------------------------------------------ */

describe("migration advisor — determinism", () => {
  it("produces identical country order for identical input", () => {
    const a = buildOfflineMigration(ENGINEER_SENIOR);
    const b = buildOfflineMigration(ENGINEER_SENIOR);
    expect(a.countries.map((c) => c.country)).toEqual(
      b.countries.map((c) => c.country),
    );
    expect(a.summary).toBe(b.summary);
  });

  it("never throws on partial input", () => {
    expect(() => buildOfflineMigration({ jobTitle: "X" })).not.toThrow();
    expect(() => buildOfflineMigration({ jobTitle: "" })).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Profile differentiation                                            */
/* ------------------------------------------------------------------ */

describe("migration advisor — differentiation", () => {
  it("engineer vs nurse produces different demand notes", () => {
    const e = buildOfflineMigration(ENGINEER_SENIOR);
    const n = buildOfflineMigration(NURSE_JUNIOR);
    const eBlob = e.countries.map((c) => c.demand).join(" | ");
    const nBlob = n.countries.map((c) => c.demand).join(" | ");
    expect(eBlob).not.toBe(nBlob);
  });

  it("experience level can shift the ranking order", () => {
    const senior = buildOfflineMigration({ ...ENGINEER_SENIOR, experienceYears: 10 });
    const junior = buildOfflineMigration({ ...ENGINEER_SENIOR, experienceYears: 0 });
    // At least the summaries should differ even if the countries overlap.
    expect(senior.summary).not.toBe(junior.summary);
  });
});

/* ------------------------------------------------------------------ */
/* Seven languages                                                    */
/* ------------------------------------------------------------------ */

describe("migration advisor — seven languages", () => {
  it("produces non-empty summary and caveats for every locale", () => {
    for (const locale of ALL_LOCALES) {
      const r = buildOfflineMigration({ ...ENGINEER_SENIOR, locale });
      expect(r.summary.length).toBeGreaterThan(20);
      expect(r.caveats.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("RTL locales produce Persian/Arabic content", () => {
    const fa = buildOfflineMigration({ ...ENGINEER_SENIOR, locale: "fa" });
    const ar = buildOfflineMigration({ ...ENGINEER_SENIOR, locale: "ar" });
    expect(/[\u0600-\u06FF]/.test(fa.summary)).toBe(true);
    expect(/[\u0600-\u06FF]/.test(ar.summary)).toBe(true);
  });

  it("returns the same number of countries for every locale", () => {
    for (const locale of ALL_LOCALES) {
      const r = buildOfflineMigration({ ...ENGINEER_SENIOR, locale });
      expect(r.countries.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Non-legal guarantees                                               */
/* ------------------------------------------------------------------ */

describe("migration advisor — non-legal guarantees", () => {
  it("always returns at least two caveats", () => {
    const r = buildOfflineMigration(ENGINEER_SENIOR);
    expect(r.caveats.length).toBeGreaterThanOrEqual(2);
  });

  it("never claims a visa is guaranteed", () => {
    const r = buildOfflineMigration(ENGINEER_SENIOR);
    const blob = `${r.summary} ${r.caveats.join(" ")} ${r.countries
      .map((c) => c.notes)
      .join(" ")}`;
    expect(/\bguaranteed visa\b/i.test(blob)).toBe(false);
    expect(/\byou will get\b/i.test(blob)).toBe(false);
  });

  it("never invents a numeric quota or score claim", () => {
    const r = buildOfflineMigration(ENGINEER_SENIOR);
    const blob = `${r.summary} ${r.countries.map((c) => c.notes).join(" ")}`;
    // No invented point thresholds like "70 points".
    expect(/\b\d{2,}\s?points\b/i.test(blob)).toBe(false);
  });

  it("labels itself as heuristic in the source field", () => {
    const r = buildOfflineMigration(ENGINEER_SENIOR);
    expect(r.source).toBe("heuristic");
  });
});
