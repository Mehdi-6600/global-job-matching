/**
 * Deterministic profile ↔ job matching.
 * No LLM calls — safe for list endpoints and high traffic.
 */

export type MatchProfileInput = {
  skills?: string | null;
  title?: string | null;
  bio?: string | null;
  experience?: string | null;
  location?: string | null;
};

export type MatchJobInput = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  remote?: boolean | null;
  tags?: string[] | null;
  requirements?: string[] | null;
  type?: string | null;
  experience?: string | null;
  company?: { name?: string | null; location?: string | null } | null;
};

export type JobMatchResult = {
  jobId: string;
  score: number;
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
};

const STOP = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "for",
  "with",
  "on",
  "at",
  "by",
  "from",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "your",
  "you",
  "we",
  "our",
  "job",
  "role",
  "work",
  "years",
  "year",
  "experience",
]);

export function tokenizeSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .split(/[,;/|·•\n]+|\s{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !STOP.has(s))
    .slice(0, 40);
}

function tokenizeText(raw: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  const parts = raw
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s,;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !STOP.has(s));
  for (const p of parts.slice(0, 80)) out.add(p);
  return out;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Score 0–100 from skills overlap, title affinity, location/remote.
 */
export function scoreJobMatch(
  profile: MatchProfileInput,
  job: MatchJobInput
): JobMatchResult {
  const profileSkills = tokenizeSkills(
    [profile.skills, profile.title, profile.bio, profile.experience]
      .filter(Boolean)
      .join(", ")
  );
  const jobSkillPool = [
    ...(job.tags || []),
    ...(job.requirements || []),
  ].map((s) => s.toLowerCase().trim());

  const jobTextTokens = tokenizeText(
    `${job.title} ${job.description || ""} ${jobSkillPool.join(" ")}`
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of profileSkills) {
    const hit =
      jobTextTokens.has(skill) ||
      jobSkillPool.some(
        (t) => t === skill || t.includes(skill) || skill.includes(t)
      );
    if (hit) matchedSkills.push(skill);
  }

  // Suggest a few job-side skills user may lack
  for (const t of jobSkillPool.slice(0, 12)) {
    if (
      t.length >= 2 &&
      !matchedSkills.includes(t) &&
      !profileSkills.includes(t)
    ) {
      missingSkills.push(t);
    }
  }

  let score = 12; // base interest
  const reasons: string[] = [];

  if (profileSkills.length === 0) {
    score = 20;
    reasons.push("Add skills to your profile for a more accurate match score.");
  } else {
    const overlapRatio =
      matchedSkills.length / Math.max(profileSkills.length, 1);
    score += Math.round(overlapRatio * 55);
    if (matchedSkills.length > 0) {
      reasons.push(
        `Matched skills: ${matchedSkills.slice(0, 5).join(", ")}`
      );
    }
  }

  const titleTokens = tokenizeText(job.title);
  const profileTitleTokens = tokenizeText(profile.title || "");
  let titleHits = 0;
  for (const t of profileTitleTokens) {
    if (titleTokens.has(t)) titleHits += 1;
  }
  if (titleHits > 0) {
    score += Math.min(18, titleHits * 6);
    reasons.push("Title keywords align with your profile headline.");
  }

  const userLoc = (profile.location || "").toLowerCase().trim();
  const jobLoc = (job.location || "").toLowerCase().trim();
  if (job.remote) {
    score += 8;
    reasons.push("Remote-friendly role.");
  } else if (userLoc && jobLoc && (jobLoc.includes(userLoc) || userLoc.includes(jobLoc))) {
    score += 10;
    reasons.push("Location overlap with your profile.");
  }

  score = clamp(score);

  if (reasons.length === 0) {
    reasons.push("Limited overlap with current profile data.");
  }

  return {
    jobId: job.id,
    score,
    reasons: reasons.slice(0, 5),
    matchedSkills: matchedSkills.slice(0, 12),
    missingSkills: missingSkills.slice(0, 8),
  };
}

export function rankJobsByMatch(
  profile: MatchProfileInput,
  jobs: MatchJobInput[],
  options?: { minScore?: number; limit?: number }
): JobMatchResult[] {
  const minScore = options?.minScore ?? 0;
  const limit = options?.limit ?? 50;
  return jobs
    .map((j) => scoreJobMatch(profile, j))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
