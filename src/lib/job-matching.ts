/**
 * List-ranking API over the canonical matching engine.
 * Single source of truth: @/lib/matching/score
 */

import {
  computeMatchScore,
  tokenize,
  type MatchProfileInput as ScoreProfile,
  type MatchJobInput as ScoreJob,
} from "@/lib/matching/score";

export type MatchProfileInput = {
  skills?: string | null;
  title?: string | null;
  bio?: string | null;
  experience?: string | null;
  education?: string | null;
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

export function tokenizeSkills(raw: string | null | undefined): string[] {
  return tokenize(raw);
}

function toScoreProfile(profile: MatchProfileInput): ScoreProfile {
  return {
    skills: profile.skills,
    title: profile.title,
    bio: profile.bio,
    experience: profile.experience,
    education: profile.education,
    location: profile.location,
  };
}

function toScoreJob(job: MatchJobInput): ScoreJob {
  return {
    title: job.title,
    description: job.description || "",
    location: job.location || "",
    remote: job.remote,
    experience: job.experience,
    requirements: job.requirements ?? [],
    tags: job.tags ?? [],
    type: job.type,
  };
}

/**
 * Score 0–100 via canonical engine. Identical inputs ⇒ identical score.
 */
export function scoreJobMatch(
  profile: MatchProfileInput,
  job: MatchJobInput
): JobMatchResult {
  const match = computeMatchScore(toScoreProfile(profile), toScoreJob(job));

  const reasons: string[] = [];
  if (match.breakdown.skills >= 50) {
    reasons.push("Strong skills overlap with job requirements");
  } else if (match.breakdown.skills >= 25) {
    reasons.push("Partial skills overlap");
  }
  if (match.breakdown.location >= 70) {
    reasons.push(job.remote ? "Remote-friendly match" : "Location aligned");
  }
  if (match.breakdown.experience >= 70) {
    reasons.push("Experience level aligned");
  }
  if (match.matchedSkills.length > 0) {
    reasons.push(`Matched: ${match.matchedSkills.slice(0, 5).join(", ")}`);
  }
  if (reasons.length === 0) {
    reasons.push("Limited profile–job overlap");
  }

  return {
    jobId: job.id,
    score: match.score,
    reasons,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingFromRequirements,
  };
}

export function rankJobsByMatch(
  profile: MatchProfileInput,
  jobs: MatchJobInput[],
  options: { minScore?: number; limit?: number } = {}
): JobMatchResult[] {
  const minScore = options.minScore ?? 0;
  const limit = options.limit ?? 50;

  return jobs
    .map((j) => scoreJobMatch(profile, j))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score || a.jobId.localeCompare(b.jobId))
    .slice(0, limit);
}
