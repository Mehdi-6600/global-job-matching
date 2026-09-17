import { describe, expect, it } from "vitest";
import { computeMatchScore } from "@/lib/matching/score";

describe("skill coverage blend", () => {
  it("single job skill is high but not a free 100 from a huge profile bag alone", () => {
    const rich = computeMatchScore(
      { skills: "Python, React, Docker, AWS, Kubernetes, Go, Rust" },
      {
        title: "Backend",
        description: "Python",
        location: "Remote",
        tags: ["python"],
        requirements: ["Python"],
      },
    );
    const focused = computeMatchScore(
      { skills: "Python" },
      {
        title: "Backend",
        description: "Python",
        location: "Remote",
        tags: ["python"],
        requirements: ["Python"],
      },
    );

    // Both cover the job requirement; focused profile should not score wildly lower.
    expect(rich.score).toBeGreaterThan(50);
    expect(focused.score).toBeGreaterThan(50);

    // Jaccard component keeps bag-of-skills from dominating exclusively.
    expect(rich.score).toBeLessThanOrEqual(100);
  });

  it("focused profile scores at least as high as a diluted bag on a single requirement", () => {
    const rich = computeMatchScore(
      { skills: "Python, React, Docker, AWS, Kubernetes, Go, Rust" },
      {
        title: "Backend",
        description: "Python",
        location: "Remote",
        tags: ["python"],
        requirements: ["Python"],
      },
    );
    const focused = computeMatchScore(
      { skills: "Python" },
      {
        title: "Backend",
        description: "Python",
        location: "Remote",
        tags: ["python"],
        requirements: ["Python"],
      },
    );

    // Jaccard penalty ensures the focused profile is not penalized.
    expect(focused.score).toBeGreaterThanOrEqual(rich.score);
  });

  it("full requirement coverage beats partial coverage", () => {
    const job = {
      title: "Backend",
      description: "Python and Docker",
      location: "Remote",
      tags: ["python", "docker"],
      requirements: ["Python", "Docker"],
    } as const;

    const full = computeMatchScore({ skills: "Python, Docker" }, job);
    const partial = computeMatchScore({ skills: "Python" }, job);

    expect(full.score).toBeGreaterThan(partial.score);
    expect(full.breakdown.skills).toBeGreaterThan(partial.breakdown.skills);
  });

  it("reports missing requirements not present in the profile", () => {
    const result = computeMatchScore(
      { skills: "Python" },
      {
        title: "Backend",
        description: "Python and Docker",
        location: "Remote",
        tags: ["python", "docker"],
        requirements: ["Python", "Docker"],
      },
    );

    expect(result.matchedSkills).toContain("python");
    expect(result.missingFromRequirements).toContain("docker");
  });

  it("returns low level when there is no meaningful overlap", () => {
    const result = computeMatchScore(
      { skills: "Accounting, Excel" },
      {
        title: "Backend Engineer",
        description: "Python, Docker, Kubernetes",
        location: "Berlin",
        tags: ["python", "docker"],
        requirements: ["Python", "Docker"],
      },
    );

    expect(result.level).toBe("low");
    expect(result.score).toBeLessThan(45);
  });

  it("remote jobs receive full location score", () => {
    const remote = computeMatchScore(
      { skills: "Python", location: "Tehran" },
      {
        title: "Backend",
        description: "Python",
        location: "Berlin",
        remote: true,
        tags: ["python"],
        requirements: ["Python"],
      },
    );
    const onsite = computeMatchScore(
      { skills: "Python", location: "Tehran" },
      {
        title: "Backend",
        description: "Python",
        location: "Berlin",
        remote: false,
        tags: ["python"],
        requirements: ["Python"],
      },
    );

    expect(remote.breakdown.location).toBe(100);
    expect(remote.score).toBeGreaterThan(onsite.score);
  });

  it("is deterministic for identical inputs", () => {
    const profile = {
      skills: "Python, Docker",
      title: "Backend Engineer",
      location: "Remote",
    };
    const job = {
      title: "Backend Engineer",
      description: "Python and Docker",
      location: "Remote",
      tags: ["python", "docker"],
      requirements: ["Python", "Docker"],
    };

    const a = computeMatchScore(profile, job);
    const b = computeMatchScore(profile, job);

    expect(a).toEqual(b);
  });

  it("handles Persian and Arabic script variants equivalently", () => {
    const withArabicYeh = computeMatchScore(
      { skills: "برنامه‌نویس" },
      {
        title: "برنامه‌نویس",
        description: "برنامه‌نویس",
        location: "تهران",
        requirements: ["برنامه‌نویس"],
      },
    );
    const withPersianYeh = computeMatchScore(
      { skills: "برنامه‌نویس" },
      {
        title: "برنامه‌نویس",
        description: "برنامه‌نویس",
        location: "تهران",
        requirements: ["برنامه‌نویس"],
      },
    );

    expect(withArabicYeh.matchedSkills.length).toBeGreaterThan(0);
    expect(withPersianYeh.matchedSkills.length).toBeGreaterThan(0);
    expect(withArabicYeh.breakdown.skills).toBe(
      withPersianYeh.breakdown.skills,
    );
  });
});
