export type MatchProfileInput = {
  skills?: string | null;
  bio?: string | null;
  experience?: string | null;
  education?: string | null;
  location?: string | null;
};

export type MatchJobInput = {
  title: string;
  description: string;
  location: string;
  remote?: boolean | null;
  experience?: string | null;
  requirements?: string[] | null;
  tags?: string[] | null;
  type?: string | null;
};

export type MatchBreakdown = {
  skills: number;
  location: number;
  experience: number;
  keywords: number;
};

export type MatchResult = {
  score: number;
  level: "low" | "medium" | "high" | "excellent";
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingFromRequirements: string[];
};

function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s\-]/g, " ")
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function unique(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function overlapRatio(a: string[], b: string[]): { ratio: number; matched: string[] } {
  if (a.length === 0 || b.length === 0) return { ratio: 0, matched: [] };
  const setB = new Set(b);
  const matched = a.filter((t) => setB.has(t));
  const ratio = matched.length / Math.max(b.length, 1);
  return { ratio: Math.min(1, ratio), matched: unique(matched) };
}

function locationScore(
  profileLoc: string | null | undefined,
  jobLoc: string,
  remote?: boolean | null
): number {
  if (remote) return 1;
  const p = (profileLoc || "").toLowerCase().trim();
  const j = (jobLoc || "").toLowerCase().trim();
  if (!p || !j) return 0.35;
  if (p === j) return 1;
  if (p.includes(j) || j.includes(p)) return 0.85;
  const pParts = tokenize(p);
  const jParts = tokenize(j);
  const { ratio } = overlapRatio(pParts, jParts);
  if (ratio >= 0.5) return 0.7;
  if (ratio > 0) return 0.45;
  return 0.15;
}

function experienceScore(
  profileExp: string | null | undefined,
  jobExp: string | null | undefined
): number {
  if (!jobExp) return 0.55;
  if (!profileExp) return 0.3;
  const p = profileExp.toLowerCase();
  const j = jobExp.toLowerCase();
  if (p.includes(j) || j.includes(p)) return 0.9;
  const yearsIn = (s: string) => {
    const m = s.match(/(\d+)\s*\+?\s*(year|yr|سال)/i);
    return m ? Number(m[1]) : null;
  };
  const py = yearsIn(p);
  const jy = yearsIn(j);
  if (py != null && jy != null) {
    if (py >= jy) return 1;
    if (py >= jy - 1) return 0.75;
    if (py >= jy - 2) return 0.5;
    return 0.25;
  }
  const { ratio } = overlapRatio(tokenize(p), tokenize(j));
  return 0.35 + ratio * 0.5;
}

function levelFromScore(score: number): MatchResult["level"] {
  if (score >= 80) return "excellent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Deterministic 0–100 match score between a job-seeker profile and a job.
 */
export function computeMatchScore(
  profile: MatchProfileInput,
  job: MatchJobInput
): MatchResult {
  const profileSkills = unique([
    ...tokenize(profile.skills),
    ...tokenize(profile.bio),
  ]);

  const requirementTokens = unique([
    ...(job.requirements || []).flatMap((r) => tokenize(r)),
    ...(job.tags || []).flatMap((t) => tokenize(t)),
    ...tokenize(job.title),
  ]);

  const skillOverlap = overlapRatio(profileSkills, requirementTokens);
  const skillsComponent = skillOverlap.ratio;

  const missingFromRequirements = requirementTokens
    .filter((t) => !skillOverlap.matched.includes(t))
    .slice(0, 12);

  const locComponent = locationScore(profile.location, job.location, job.remote);
  const expComponent = experienceScore(profile.experience, job.experience);

  const keywordPool = unique([
    ...tokenize(job.description).slice(0, 80),
    ...tokenize(job.title),
  ]);
  const keywordOverlap = overlapRatio(profileSkills, keywordPool);
  const keywordComponent = keywordOverlap.ratio;

  // Weights: skills dominate
  const weighted =
    skillsComponent * 0.45 +
    locComponent * 0.2 +
    expComponent * 0.2 +
    keywordComponent * 0.15;

  const score = Math.round(Math.min(100, Math.max(0, weighted * 100)));

  return {
    score,
    level: levelFromScore(score),
    breakdown: {
      skills: Math.round(skillsComponent * 100),
      location: Math.round(locComponent * 100),
      experience: Math.round(expComponent * 100),
      keywords: Math.round(keywordComponent * 100),
    },
    matchedSkills: skillOverlap.matched.slice(0, 15),
    missingFromRequirements,
  };
}
