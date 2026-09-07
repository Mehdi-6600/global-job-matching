/**
 * Legacy job-list matcher API.
 * Scoring is delegated to @/lib/matching/score (single engine).
 */

import type { Job } from "@prisma/client";
import {
  computeMatchScore,
  type MatchProfileInput,
} from "@/lib/matching/score";

export interface UserProfile {
  title: string;
  skills: string[];
  city?: string;
  country?: string;
  radius: number;
  salaryMin?: number;
  languages?: string[];
  bio?: string;
  experience?: string;
  education?: string;
  location?: string;
}

export interface JobMatch {
  job: Job;
  score: number;
  matchReasons: string[];
}

function toMatchProfile(user: UserProfile): MatchProfileInput {
  return {
    skills: user.skills?.join(", ") || user.title || "",
    bio: user.bio || user.title || "",
    experience: user.experience || null,
    education: user.education || null,
    location:
      user.location ||
      [user.city, user.country].filter(Boolean).join(", ") ||
      null,
  };
}

export function matchJobsToUser(
  jobs: Job[],
  user: UserProfile
): JobMatch[] {
  const profile = toMatchProfile(user);

  const results: JobMatch[] = jobs.map((job) => {
    const match = computeMatchScore(profile, {
      title: job.title,
      description: job.description || "",
      location: job.location || "",
      remote: job.remote,
      experience: job.experience,
      requirements: job.requirements ?? [],
      tags: job.tags ?? [],
      type: job.type,
    });

    const matchReasons: string[] = [];
    if (match.breakdown.skills >= 50) {
      matchReasons.push(`Skills overlap (${match.breakdown.skills}%)`);
    }
    if (match.breakdown.location >= 50) {
      matchReasons.push(`Location fit (${match.breakdown.location}%)`);
    }
    if (match.matchedSkills.length > 0) {
      matchReasons.push(
        `Matched: ${match.matchedSkills.slice(0, 5).join(", ")}`
      );
    }

    return {
      job,
      score: match.score,
      matchReasons,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
