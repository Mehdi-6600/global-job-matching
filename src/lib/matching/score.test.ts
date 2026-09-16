import { describe, expect, it } from "vitest";
import {
  computeMatchScore,
  tokenize,
  normalizeScript,
} from "@/lib/matching/score";
import { scoreJobMatch } from "@/lib/job-matching";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EN_PROFILE = {
  skills: "React, TypeScript",
  title: "Frontend Developer",
  location: "Berlin",
};

const EN_JOB = {
  title: "React Engineer",
  description: "TypeScript and React",
  location: "Berlin",
  remote: false,
  tags: ["react", "typescript"],
  requirements: ["React"],
};

const FA_PROFILE = {
  skills: "لوله‌کشی، جوشکاری",
  location: "مشهد",
};

const FA_STRONG_JOB = {
  id: "1",
  title: "لوله‌کش ساختمان",
  description: "نیاز به تجربه لوله‌کشی و جوشکاری",
  location: "مشهد",
  tags: ["لوله‌کشی"],
  requirements: ["جوشکاری"],
};

const FA_WEAK_JOB = {
  id: "2",
  title: "Software Engineer",
  description: "Java and Spring",
  location: "Berlin",
  tags: ["java"],
  requirements: ["Spring"],
};

// ---------------------------------------------------------------------------
// tokenize (multilingual)
// ---------------------------------------------------------------------------

describe("tokenize multilingual", () => {
  it("keeps Persian tokens", () => {
    const tokens = tokenize("لوله‌کشی تعمیرات ساختمان");
    expect(tokens.some((t) => t.includes("لوله") || t.length >= 2)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("keeps Arabic tokens", () => {
    const tokens = tokenize("مهندس برمجيات تطوير");
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("keeps English tokens", () => {
    expect(tokenize("React TypeScript")).toEqual(
      expect.arrayContaining(["react", "typescript"]),
    );
  });

  it("handles mixed Persian/English", () => {
    const tokens = tokenize("React برنامه‌نویس Frontend");
    expect(tokens).toEqual(expect.arrayContaining(["react", "frontend"]));
  });

  it("returns an empty list for empty or whitespace-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("normalizes case for English tokens", () => {
    expect(tokenize("REACT TypeScript")).toEqual(
      expect.arrayContaining(["react", "typescript"]),
    );
  });
});

// ---------------------------------------------------------------------------
// normalizeScript
// ---------------------------------------------------------------------------

describe("normalizeScript", () => {
  it("maps Arabic yeh/kaf variants toward Persian forms", () => {
    // ي (Arabic yeh) → ی, ك (Arabic kaf) → ک
    const n = normalizeScript("يك");
    expect(n).toContain("ی");
    expect(n).toContain("ک");
  });

  it("is idempotent on already-normalized Persian text", () => {
    const once = normalizeScript("یک");
    const twice = normalizeScript(once);
    expect(twice).toBe(once);
  });

  it("leaves Latin text untouched", () => {
    expect(normalizeScript("React")).toBe("React");
  });
});

// ---------------------------------------------------------------------------
// computeMatchScore (deterministic + FA)
// ---------------------------------------------------------------------------

describe("computeMatchScore deterministic + FA", () => {
  it("is deterministic for identical inputs", () => {
    expect(computeMatchScore(EN_PROFILE, EN_JOB).score).toBe(
      computeMatchScore(EN_PROFILE, EN_JOB).score,
    );
  });

  it("returns a bounded score between 0 and 100", () => {
    const { score } = computeMatchScore(EN_PROFILE, EN_JOB);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores Persian skill overlap via list engine", () => {
    const strong = scoreJobMatch(FA_PROFILE, FA_STRONG_JOB);
    const weak = scoreJobMatch(FA_PROFILE, FA_WEAK_JOB);
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("is stable across repeated FA evaluations", () => {
    const first = scoreJobMatch(FA_PROFILE, FA_STRONG_JOB).score;
    const second = scoreJobMatch(FA_PROFILE, FA_STRONG_JOB).score;
    expect(first).toBe(second);
  });
});
