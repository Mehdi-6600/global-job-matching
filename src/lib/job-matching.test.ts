import { describe, expect, it } from "vitest";
import {
  rankJobsByMatch,
  scoreJobMatch,
  tokenizeSkills,
} from "@/lib/job-matching";

describe("tokenizeSkills", () => {
  it("splits common separators", () => {
    expect(tokenizeSkills("React, TypeScript; Next.js")).toEqual(
      expect.arrayContaining(["react", "typescript", "next.js"])
    );
  });
});

describe("scoreJobMatch", () => {
  it("scores higher when skills overlap", () => {
    const profile = {
      skills: "React, TypeScript, Next.js",
      title: "Frontend Developer",
      location: "Berlin",
    };
    const strong = scoreJobMatch(profile, {
      id: "1",
      title: "React Frontend Engineer",
      description: "Build UI with TypeScript and Next.js",
      tags: ["react", "typescript"],
      remote: true,
    });
    const weak = scoreJobMatch(profile, {
      id: "2",
      title: "Warehouse Associate",
      description: "Physical inventory",
      tags: ["logistics"],
      remote: false,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.matchedSkills.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const profile = { skills: "node, sql" };
    const job = {
      id: "a",
      title: "Backend Engineer",
      description: "Node and SQL APIs",
      tags: ["node"],
    };
    expect(scoreJobMatch(profile, job).score).toBe(
      scoreJobMatch(profile, job).score
    );
  });
});

describe("rankJobsByMatch", () => {
  it("orders by score desc", () => {
    const ranked = rankJobsByMatch(
      { skills: "python, data" },
      [
        { id: "low", title: "Chef", description: "Kitchen" },
        {
          id: "high",
          title: "Data Engineer",
          description: "Python pipelines",
          tags: ["python", "data"],
        },
      ],
      { limit: 10 }
    );
    expect(ranked[0].jobId).toBe("high");
  });
});
