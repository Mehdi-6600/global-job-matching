export type MatchBreakdown = {
  skills: number;
  location: number;
  experience: number;
  remote: number;
  overall: number;
};

export type MatchResult = {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.\u0600-\u06FF]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 40;
  const setB = new Set(b);
  let hits = 0;
  for (const t of a) {
    if (setB.has(t)) hits += 1;
  }
  const ratio = hits / Math.max(a.length, 1);
  return clamp(30 + ratio * 70);
}

export type ProfileLike = {
  skills?: string | null;
  experience?: string | null;
  location?: string | null;
  bio?: string | null;
};

export type JobLike = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  remote?: boolean | null;
  experience?: string | null;
  requirements?: string[] | null;
  tags?: string[] | null;
};

/**
 * Lightweight heuristic match (not ML).
 * Good enough for v1 "why this job fits you".
 */
export function computeMatchScore(
  profile: ProfileLike,
  job: JobLike
): MatchResult {
  const profileSkills = tokenize(
    `${profile.skills || ""} ${profile.bio || ""} ${profile.experience || ""}`
  );
  const jobSkills = tokenize(
    `${job.title || ""} ${(job.requirements || []).join(" ")} ${(job.tags || []).join(" ")} ${job.description || ""}`
  );

  const skills = overlapScore(profileSkills, jobSkills);

  const pLoc = (profile.location || "").toLowerCase();
  const jLoc = (job.location || "").toLowerCase();
  let location = 50;
  const reasons: string[] = [];

  if (job.remote) {
    location = 95;
    reasons.push("Remote-friendly role");
  } else if (pLoc && jLoc && (pLoc.includes(jLoc) || jLoc.includes(pLoc))) {
    location = 90;
    reasons.push("Location looks compatible");
  } else if (pLoc && jLoc) {
    location = 45;
    reasons.push("Location may require relocation");
  } else {
    location = 55;
  }

  const pExp = `${profile.experience || ""}`.toLowerCase();
  const jExp = `${job.experience || ""}`.toLowerCase();
  let experience = 55;
  if (jExp.includes("senior") && (pExp.includes("senior") || pExp.includes("lead"))) {
    experience = 88;
    reasons.push("Seniority signals align");
  } else if (jExp.includes("entry") || jExp.includes("junior")) {
    experience = 75;
  } else if (jExp.includes("mid")) {
    experience = 70;
  }

  const remote = job.remote ? 90 : 60;

  const overall = clamp(
    skills * 0.45 + location * 0.2 + experience * 0.25 + remote * 0.1
  );

  if (skills >= 70) reasons.push("Skills overlap with the role");
  if (skills < 45) reasons.push("Consider adding more relevant skills to your profile");

  return {
    score: overall,
    breakdown: {
      skills: clamp(skills),
      location: clamp(location),
      experience: clamp(experience),
      remote: clamp(remote),
      overall,
    },
    reasons: reasons.slice(0, 5),
  };
}
