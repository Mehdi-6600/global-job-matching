import { describe, expect, it } from "vitest";
import { AI_TOTAL_BUDGET_MS } from "@/lib/ai";
import { buildCareerProfile } from "@/lib/career-intelligence/profile";

describe("AI budget + target specialization reliability", () => {
  it("shared AI total budget is capped at 18s", () => {
    expect(AI_TOTAL_BUDGET_MS).toBe(18_000);
  });

  it("Frontend → AI Engineer does not inherit full_stack as targetSpecialization", () => {
    const p = buildCareerProfile({
      jobTitle: "Frontend Developer",
      skills: "React, TypeScript, Node.js",
      targetRole: "AI Engineer",
      careerGoal: "move into machine learning",
      locale: "en",
    });
    expect(p.targetRole).toBe("AI Engineer");
    expect(p.specialization).toBe("full_stack");
    expect(p.targetSpecialization).toBe("ai_ml");
    expect(p.targetRoleFamily).toBe("data");
  });

  it("sparse profile does not crash", () => {
    const p = buildCareerProfile({ jobTitle: "Worker", locale: "fa" });
    expect(p.currentRole).toBeTruthy();
    expect(p.uncertainty.length).toBeGreaterThan(0);
  });
});
