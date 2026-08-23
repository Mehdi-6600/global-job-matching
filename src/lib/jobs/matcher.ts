import type { Job } from "@prisma/client";

export interface UserProfile {
  title: string;
  skills: string[];
  city?: string;
  country?: string;
  radius: number;
  salaryMin?: number;
  languages?: string[];
}

export interface JobMatch {
  job: Job;
  score: number;
  matchReasons: string[];
}

function locationSimilarity(
  userLocation: string,
  jobLocation: string
): number {
  const userTokens = userLocation.toLowerCase().split(",");
  const jobTokens = jobLocation.toLowerCase().split(",");

  const matches = userTokens.filter((token) =>
    jobTokens.some(
      (jobToken) =>
        jobToken.includes(token.trim()) || token.trim().includes(jobToken)
    )
  ).length;

  return Math.min(100, (matches / Math.max(userTokens.length, 1)) * 100);
}

function skillMatching(userSkills: string[], jobDescription: string): number {
  const description = jobDescription.toLowerCase();
  const matches = userSkills.filter((skill) =>
    description.includes(skill.toLowerCase())
  ).length;

  return Math.min(100, (matches / Math.max(userSkills.length, 1)) * 100);
}

function salaryMatching(
  userMinSalary: number | undefined,
  jobSalaryMin: number | null | undefined,
  jobSalaryMax: number | null | undefined
): number {
  if (!userMinSalary) return 50;

  let jobSalaryNum = 0;
  if (jobSalaryMin && jobSalaryMax) {
    jobSalaryNum = (jobSalaryMin + jobSalaryMax) / 2;
  } else if (jobSalaryMin) {
    jobSalaryNum = jobSalaryMin;
  } else if (jobSalaryMax) {
    jobSalaryNum = jobSalaryMax;
  } else {
    return 50;
  }

  if (jobSalaryNum >= userMinSalary) return 100;
  if (jobSalaryNum >= userMinSalary * 0.8) return 75;
  if (jobSalaryNum >= userMinSalary * 0.6) return 50;
  return 25;
}

function titleRelevance(userTitle: string, jobTitle: string): number {
  const userWords = userTitle.toLowerCase().split(" ");
  const jobWords = jobTitle.toLowerCase().split(" ");

  const matches = userWords.filter((word) => jobWords.includes(word)).length;
  return Math.min(100, (matches / Math.max(userWords.length, 1)) * 100);
}

export function matchJobs(
  profile: UserProfile,
  jobs: Job[]
): JobMatch[] {
  const profileLocation = [profile.city, profile.country]
    .filter(Boolean)
    .join(", ") || profile.city || profile.country || "";

  return jobs
    .map((job) => {
      const matchReasons: string[] = [];

      const locationScore = locationSimilarity(profileLocation, job.location);
      if (locationScore > 50) matchReasons.push("Location match");

      const skillScore = skillMatching(profile.skills, job.description);
      if (skillScore > 60) matchReasons.push("Skills match");

      const salaryScore = salaryMatching(
        profile.salaryMin,
        job.salaryMin,
        job.salaryMax
      );
      if (salaryScore === 100) matchReasons.push("Salary meets expectations");
      if (salaryScore >= 75) matchReasons.push("Salary is acceptable");

      const titleScore = titleRelevance(profile.title, job.title);
      if (titleScore > 40) matchReasons.push("Title is relevant");

      const finalScore =
        locationScore * 0.4 +
        skillScore * 0.3 +
        salaryScore * 0.2 +
        titleScore * 0.1;

      return {
        job,
        score: Math.round(finalScore),
        matchReasons: matchReasons.length > 0 ? matchReasons : ["Potential match"],
      };
    })
    .filter((match) => match.score >= 40)
    .sort((a, b) => b.score - a.score);
}
