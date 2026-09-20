/**
 * Resume writer tests — Phase 5 (multi-language + ATS quality gate).
 *
 * Validates:
 *  - Deterministic output for identical input
 *  - Seven-locale section headers
 *  - Achievements never invented
 *  - ATS-friendly structure (standard section names)
 *  - Target role prioritization
 *  - Tone affects only the summary
 *  - No fabrication markers
 */
import { describe, it, expect } from "vitest";
import { buildResume, type ResumeWriterInput } from "./writer";
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

const BASE_INPUT: ResumeWriterInput = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "+49 170 000",
  location: "Berlin, Germany",
  targetRole: "Frontend Developer",
  summary:
    "Frontend developer with 5 years of experience building accessible web applications.",
  experience:
    "Built a design system used by 3 product teams\nMentored 2 junior developers\nLed migration from Webpack to Vite",
  education: "BSc Computer Science, TU Berlin",
  skills: "React, TypeScript, Next.js, accessibility, testing",
  languages: "English, German",
  certifications: ["AWS Cloud Practitioner"],
  achievements: [],
  metrics: [],
  tone: "professional",
  locale: "en",
};

/* ------------------------------------------------------------------ */
/* Determinism                                                        */
/* ------------------------------------------------------------------ */

describe("resume writer — determinism", () => {
  it("produces identical output for identical input", () => {
    const a = buildResume(BASE_INPUT);
    const b = buildResume(BASE_INPUT);
    expect(a.text).toBe(b.text);
    expect(a.meta).toEqual(b.meta);
  });

  it("never throws on partial input", () => {
    expect(() => buildResume({ fullName: "X" })).not.toThrow();
    expect(() => buildResume({ fullName: "" })).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Seven-language headers                                             */
/* ------------------------------------------------------------------ */

describe("resume writer — seven languages", () => {
  it("uses localized section headers in every locale", () => {
    const expectedByLocale: Record<CareerRiskLocale, string[]> = {
      en: ["PROFESSIONAL SUMMARY", "SKILLS"],
      fa: ["خلاصه حرفه‌ای", "مهارت‌ها"],
      ar: ["الملف المهني", "المهارات"],
      es: ["RESUMEN PROFESIONAL", "HABILIDADES"],
      fr: ["RÉSUMÉ PROFESSIONNEL", "COMPÉTENCES"],
      de: ["PROFIL", "FÄHIGKEITEN"],
      hi: ["पेशेवर सारांश", "कौशल"],
    };

    for (const locale of ALL_LOCALES) {
      const r = buildResume({ ...BASE_INPUT, locale });
      const [summaryHeader, skillsHeader] = expectedByLocale[locale];
      expect(r.text).toContain(summaryHeader);
      expect(r.text).toContain(skillsHeader);
    }
  });

  it("never embeds English headers in non-English output", () => {
    for (const locale of ALL_LOCALES) {
      if (locale === "en") continue;
      const r = buildResume({ ...BASE_INPUT, locale });
      expect(r.text).not.toContain("PROFESSIONAL SUMMARY");
      expect(r.text).not.toContain("CORE COMPETENCIES");
    }
  });
});

/* ------------------------------------------------------------------ */
/* ATS structure                                                      */
/* ------------------------------------------------------------------ */

describe("resume writer — ATS structure", () => {
  it("includes contact header when email is provided", () => {
    const r = buildResume(BASE_INPUT);
    expect(r.text).toContain("jane@example.com");
    expect(r.text).toContain("Berlin, Germany");
  });

  it("includes target role line when provided", () => {
    const r = buildResume(BASE_INPUT);
    expect(r.text).toContain("Frontend Developer");
  });

  it("includes education section when provided", () => {
    const r = buildResume(BASE_INPUT);
    expect(r.meta.sectionsIncluded).toContain("education");
  });

  it("includes skills section when provided", () => {
    const r = buildResume(BASE_INPUT);
    expect(r.meta.sectionsIncluded).toContain("skills");
  });

  it("omits empty sections", () => {
    const r = buildResume({
      fullName: "X Y",
      email: "x@y.com",
    });
    // No skills were provided, so the section should not appear.
    expect(r.meta.sectionsIncluded).not.toContain("skills");
    expect(r.meta.sectionsIncluded).not.toContain("languages");
  });
});

/* ------------------------------------------------------------------ */
/* Target prioritization                                              */
/* ------------------------------------------------------------------ */

describe("resume writer — target prioritization", () => {
  it("places target-matching skills first in the skills list", () => {
    const r = buildResume({
      ...BASE_INPUT,
      targetRole: "React Developer",
      skills: "TypeScript, React, Next.js",
    });
    const skillsLine = r.text
      .split("\n")
      .find((line) => line.toLowerCase().includes("react"));
    expect(skillsLine).toBeDefined();
    // React should come first because it matches the target.
    const idx = skillsLine!.indexOf("React");
    const idxTs = skillsLine!.indexOf("TypeScript");
    if (idx !== -1 && idxTs !== -1) {
      expect(idx).toBeLessThan(idxTs);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Tone                                                               */
/* ------------------------------------------------------------------ */

describe("resume writer — tone", () => {
  it("concise tone shortens the summary but does not remove sections", () => {
    const normal = buildResume({ ...BASE_INPUT, tone: "professional" });
    const concise = buildResume({ ...BASE_INPUT, tone: "concise" });
    expect(concise.text.length).toBeLessThanOrEqual(normal.text.length);
    expect(concise.meta.sectionsIncluded).toContain("experience");
  });
});

/* ------------------------------------------------------------------ */
/* Anti-fabrication                                                   */
/* ------------------------------------------------------------------ */

describe("resume writer — anti-fabrication", () => {
  it("does not invent degrees when education is empty", () => {
    const r = buildResume({
      fullName: "X Y",
      email: "x@y.com",
      experience: "Did work",
    });
    expect(/\b(BSc|MSc|PhD)\b/.test(r.text)).toBe(false);
  });

  it("does not invent certifications when none provided", () => {
    const r = buildResume({
      fullName: "X Y",
      email: "x@y.com",
      experience: "Did work",
    });
    expect(r.meta.sectionsIncluded).not.toContain("certifications");
  });
});

/* ------------------------------------------------------------------ */
/* Achievements extraction                                            */
/* ------------------------------------------------------------------ */

describe("resume writer — achievements extraction", () => {
  it("counts extracted achievements from the experience lines", () => {
    const r = buildResume(BASE_INPUT);
    expect(r.meta.achievementsExtracted).toBeGreaterThan(0);
  });

  it("does not invent metrics when none are provided", () => {
    const r = buildResume({
      ...BASE_INPUT,
      metrics: [],
      experience: "Managed a small team",
    });
    // No numeric metric was provided, so the Achievements section
    // should not appear.
    expect(r.meta.sectionsIncluded).not.toContain("achievements");
    expect(r.meta.hasMetrics).toBe(false);
  });

  it("creates an Achievements section when metrics are provided", () => {
    const r = buildResume({
      ...BASE_INPUT,
      metrics: ["Reduced build time by 40%"],
    });
    expect(r.meta.hasMetrics).toBe(true);
    expect(r.meta.sectionsIncluded).toContain("achievements");
  });
});
