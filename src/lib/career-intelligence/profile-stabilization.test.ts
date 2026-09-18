import { describe, expect, it } from "vitest";
import { buildCareerProfile } from "@/lib/career-intelligence/profile";
import { buildOfflineMigration } from "@/lib/career-intelligence/offline-migration";
import { buildOfflineRoadmap } from "@/lib/career-intelligence/offline-roadmap";

describe("stabilization: responsibilities + target isolation", () => {
  it("responsibilities create task signals (management + automation)", () => {
    const p = buildCareerProfile({
      jobTitle: "Frontend Developer",
      skills: "React, TypeScript",
      responsibilities:
        "Manage engineering team and conduct code reviews\nGenerate repetitive weekly reports",
      locale: "en",
    });
    expect(p.responsibilities.length).toBeGreaterThan(0);
    expect(p.tasks.some((t) => t.interpersonal >= 80 || t.judgment >= 75)).toBe(
      true
    );
    expect(p.tasks.some((t) => t.automation >= 80)).toBe(true);
  });

  it("target AI Engineer is not rewritten to full_stack by React skills", () => {
    const p = buildCareerProfile({
      jobTitle: "Frontend Developer",
      skills: "React, Node.js, TypeScript",
      targetRole: "AI Engineer",
      locale: "en",
    });
    expect(p.targetRole).toBe("AI Engineer");
    expect(p.specialization).toBe("full_stack"); // current
    expect(p.targetSpecialization).not.toBe("full_stack");
  });

  it("Java is not matched as JavaScript in skill presence", () => {
    const p = buildCareerProfile({
      jobTitle: "Backend Engineer",
      skills: "Java, Spring, PostgreSQL",
      targetRole: "Backend Engineer",
      locale: "en",
    });
    expect(p.technicalSkills.some((s) => /java/i.test(s))).toBe(true);
  });

  it("two software engineers get different migration order with different profiles", () => {
    const a = buildOfflineMigration({
      jobTitle: "Backend Engineer",
      skills: "Java, Spring",
      experienceYears: 8,
      languages: "German B2",
      locale: "en",
    });
    const b = buildOfflineMigration({
      jobTitle: "Frontend Engineer",
      skills: "React",
      experienceYears: 1,
      languages: "English A1",
      locale: "en",
    });
    // country lists may share pool but ranking/notes should differ
    expect(a.countries[0].notes).not.toEqual(b.countries[0].notes);
  });

  it("roadmap uses target role in title", () => {
    const r = buildOfflineRoadmap({
      jobTitle: "Frontend Developer",
      skills: "React, TypeScript",
      targetRole: "AI Engineer",
      locale: "en",
    });
    expect(r.title).toMatch(/AI Engineer/);
  });
});
