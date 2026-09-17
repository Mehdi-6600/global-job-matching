/**
 * Canonical deterministic matching engine (single source of truth).
 * Unicode-safe tokenization for en / fa / ar and mixed text.
 */

export type MatchProfileInput = {
  skills?: string | null;
  title?: string | null;
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

export type MatchLevel = "low" | "medium" | "high" | "excellent";

export type MatchResult = {
  score: number;
  level: MatchLevel;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingFromRequirements: string[];
};

const STOP = new Set([
  "and", "or", "the", "a", "an", "to", "of", "in", "for", "with", "on", "at",
  "by", "from", "as", "is", "are", "be", "this", "that", "your", "you", "we",
  "our", "job", "role", "work", "years", "year", "experience",
  "و", "در", "به", "از", "که", "را", "با", "برای",
]);

/** Normalize common Arabic/Persian letter variants. */
export function normalizeScript(text: string): string {
  return text
    .replace(/\u064A/g, "\u06CC") // ي → ی
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u200C/g, " ")      // ZWNJ → space
    .replace(/\u0640/g, "");      // tatweel
}

/**
 * Unicode-aware tokenizer: keeps Latin, digits, and Arabic block letters.
 * Drops stopwords and tokens shorter than 2 characters.
 */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  const normalized = normalizeScript(text.toLowerCase());
  return normalized
    .replace(/[^\p{L}\p{N}+#.\s\-]/gu, " ")
    .split(/[\s,;/|·•]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function unique(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function overlapRatio(
  a: string[],
  b: string[],
): { ratio: number; matched: string[] } {
  if (a.length === 0 || b.length === 0) return { ratio: 0, matched: [] };
  const setB = new Set(b);
  const matched = a.filter((t) => setB.has(t));
  // Requirement coverage: share of job tokens covered by the candidate.
  const coverage = matched.length / Math.max(b.length, 1);
  // Jaccard softens "one job skill, huge candidate bag → perfect score".
  const union = new Set([...a, ...b]).size;
  const jaccard = matched.length / Math.max(union, 1);
  const ratio = Math.min(1, coverage * 0.7 + jaccard * 0.3);
  return { ratio, matched: unique(matched) };
}

function locationScore(
  profileLoc: string | null | undefined,
  jobLoc: string,
  remote?: boolean | null,
): number {
  if (remote) return 1;
  const p = normalizeScript((profileLoc ?? "").toLowerCase().trim());
  const j = normalizeScript((jobLoc ?? "").toLowerCase().trim());
  if (!p || !j) return 0.35;
  if (p === j) return 1;
  if (p.includes(j) || j.includes(p)) return 0.85;
  const { ratio } = overlapRatio(tokenize(p), tokenize(j));
  if (ratio >= 0.5) return 0.7;
  if (ratio > 0) return 0.45;
  return 0.15;
}

function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function yearsIn(s: string): number | null {
  const t = toAsciiDigits(s);

  // Ranges: "2-4 years", "2–4 سال"
  const range = t.match(
    /(\d+)\s*[-–—]\s*(\d+)\s*\+?\s*(year|yr|سال)?/i,
  );
  if (range) {
    return (Number(range[1]) + Number(range[2])) / 2;
  }

  const m = t.match(/(\d+(?:\.\d+)?)\s*\+?\s*(year|yr|سال)/i);
  if (m) return Number(m[1]);

  // Level keywords (shared taxonomy).
  if (/\b(intern|entry|junior|entry[- ]?level|تازه‌?کار|کارآموز)\b/i.test(t)) {
    return 1;
  }
  if (/\b(mid[- ]?level|intermediate|میان)\b/i.test(t)) return 3;
  if (/\b(senior|lead|principal|expert|ارشد|خبره)\b/i.test(t)) return 6;

  return null;
}

function experienceScore(
  profileExp: string | null | undefined,
  jobExp: string | null | undefined,
): number {
  if (!jobExp) return 0.55;
  if (!profileExp) return 0.3;

  const p = normalizeScript(toAsciiDigits(profileExp.toLowerCase()));
  const j = normalizeScript(toAsciiDigits(jobExp.toLowerCase()));

  if (p.includes(j) || j.includes(p)) return 0.9;

  const py = yearsIn(p);
  const jy = yearsIn(j);
  if (py != null && jy != null) {
    if (py >= jy) return 1;
    if (py >= jy - 1) return 0.75;
    if (py >= jy - 2) return 0.5;
    return 0.25;
  }

  const { ratio } = overlapRatio(tokenize(p), tokenize(j));
  return Math.max(0.25, ratio);
}

function levelFromScore(score: number): MatchLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/**
 * Canonical score 0–100. Same inputs always produce the same output.
 */
export function computeMatchScore(
  profile: MatchProfileInput,
  job: MatchJobInput,
): MatchResult {
  const profileSkillTokens = unique(
    tokenize(
      [
        profile.skills,
        profile.title,
        profile.bio,
        profile.experience,
        profile.education,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  );

  const requirementTokens = unique(
    [...(job.requirements ?? []), ...(job.tags ?? [])].flatMap((s) =>
      tokenize(s),
    ),
  );

  const jobTextTokens = unique(
    tokenize(`${job.title} ${job.description || ""} ${job.type || ""}`),
  );

  const skillPool =
    requirementTokens.length > 0 ? requirementTokens : jobTextTokens;

  const skillOverlap = overlapRatio(profileSkillTokens, skillPool);
  const keywordOverlap = overlapRatio(profileSkillTokens, jobTextTokens);

  // Optional title affinity (only when profile has a real title).
  let titleBoost = 0;
  if (profile.title && profile.title.trim().length >= 2) {
    const titleTokens = tokenize(profile.title);
    const jobTitleTokens = tokenize(job.title);
    const { ratio } = overlapRatio(titleTokens, jobTitleTokens);
    titleBoost = ratio * 0.08;
  }

  const skillsPart = skillOverlap.ratio;
  const locPart = locationScore(profile.location, job.location, job.remote);
  const expPart = experienceScore(profile.experience, job.experience);
  const kwPart = keywordOverlap.ratio;

  const raw =
    skillsPart * 0.45 +
    locPart * 0.2 +
    expPart * 0.15 +
    kwPart * 0.2 +
    titleBoost;

  const score = Math.max(0, Math.min(100, Math.round(raw * 100)));

  const missingFromRequirements = requirementTokens
    .filter((t) => !skillOverlap.matched.includes(t))
    .slice(0, 12);

  return {
    score,
    level: levelFromScore(score),
    breakdown: {
      skills: Math.round(skillsPart * 100),
      location: Math.round(locPart * 100),
      experience: Math.round(expPart * 100),
      keywords: Math.round(kwPart * 100),
    },
    matchedSkills: skillOverlap.matched.slice(0, 20),
    missingFromRequirements,
  };
}
