import { describe, expect, it } from "vitest";
import {
  buildCareerProfile,
} from "@/lib/career-intelligence/profile";
import { buildOfflineRoadmap } from "@/lib/career-intelligence/offline-roadmap";
import { heuristicCareerRisk } from "@/lib/career-risk";

describe("BUG fixes personalization core", () => {
  it("preserves targetRole in CareerProfile", () => {
    const p = buildCareerProfile({
      jobTitle: "Software Engineer",
      skills: "TypeScript, React, Node.js",
      experienceYears: 6,
      targetRole: "Senior Full-Stack Engineer",
      locale: "en",
    });
    expect(p.targetRole).toBe("Senior Full-Stack Engineer");
    expect(p.targetRoleFamily).toBeTruthy();
  });

  it("classifies soft skills vs tools vs languages", () => {
    const p = buildCareerProfile({
      jobTitle: "Analyst",
      skills: "communication, Excel, Python, leadership, Docker",
      locale: "en",
    });
    expect(p.softSkills.some((s) => /communication|leadership/i.test(s))).toBe(
      true
    );
    expect(p.tools.some((s) => /excel|docker/i.test(s))).toBe(true);
    expect(p.technicalSkills.some((s) => /python/i.test(s))).toBe(true);
  });

  it("full-stack when React+Node present", () => {
    const p = buildCareerProfile({
      jobTitle: "Software Engineer",
      skills: "React, Node.js, TypeScript",
      locale: "en",
    });
    expect(p.specialization).toBe("full_stack");
  });

  it("Operations Manager is management not clerical", () => {
    const p = buildCareerProfile({
      jobTitle: "Operations Manager",
      skills: "planning",
      locale: "en",
    });
    expect(p.roleFamily).toBe("management");
  });

  it("locale does not invent language proficiency", () => {
    const p = buildCareerProfile({
      jobTitle: "Engineer",
      locale: "fa",
    });
    expect(p.languages).toEqual([]);
    expect(p.uncertainty).toContain("missing_language_proficiency");
  });

  it("different targets → different roadmaps", () => {
    const a = buildOfflineRoadmap({
      jobTitle: "Accountant",
      skills: "Excel, tax",
      experienceYears: 8,
      targetRole: "Finance Manager",
      locale: "en",
    });
    const b = buildOfflineRoadmap({
      jobTitle: "Accountant",
      skills: "Excel, tax",
      experienceYears: 8,
      targetRole: "Data Analyst",
      locale: "en",
    });
    expect(a.title).not.toEqual(b.title);
    expect(a.weeks[0].focus).not.toEqual(b.weeks[0].focus);
  });

  it("experience affects offline risk reasons", () => {
    const junior = heuristicCareerRisk("Teacher", "classroom", {
      experienceYears: 2,
      locale: "en",
    });
    const senior = heuristicCareerRisk("Teacher", "classroom", {
      experienceYears: 15,
      locale: "en",
    });
    expect(junior.summary).not.toEqual(senior.summary);
  });
});
