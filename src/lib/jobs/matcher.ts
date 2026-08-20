import type { JobListing } from "@prisma/client";

export interface UserProfile {
  title: string;
  skills: string[];
  location: string;
  radius: number; // miles
  salaryMin?: number;
  languages?: string[];
}

export interface JobMatch {
  job: JobListing;
  score: number; // 0-100
  matchReasons: string[];
}

// Haversine formula - calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple location similarity (string-based, no geo API needed)
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

// Skill matching
function skillMatching(userSkills: string[], jobDescription: string): number {
  const description = jobDescription.toLowerCase();
  const matches = userSkills.filter((skill) =>
    description.includes(skill.toLowerCase())
  ).length;

  return Math.min(
    100,
    (matches / Math.max(userSkills.length, 1)) * 100
  );
}

// Salary matching
function salaryMatching(userMinSalary: number | undefined, jobSalary: string | undefined): number {
  if (!userMinSalary || !jobSalary) return 50; // neutral if unknown

  const jobSalaryNum = parseInt(jobSalary.replace(/\D/g, ""));
  if (!jobSalaryNum) return 50;

  if (jobSalaryNum >= userMinSalary) return 100;
  if (jobSalaryNum >= userMinSalary * 0.8) return 75;
  if (jobSalaryNum >= userMinSalary * 0.6) return 50;

  return 25;
}

// Title relevance (simple keyword matching)
function titleRelevance(userTitle: string, jobTitle: string): number {
  const userWords = userTitle.toLowerCase().split(" ");
  const jobWords = jobTitle.toLowerCase().split(" ");

  const matches = userWords.filter((word) => jobWords.includes(word)).length;
  return Math.min(100, (matches / Math.max(userWords.length, 1)) * 100);
}

export function matchJobs(
  profile: UserProfile,
  jobs: JobListing[]
): JobMatch[] {
  return jobs
    .map((job) => {
      const matchReasons: string[] = [];

      // Location score (40% weight)
      const locationScore = locationSimilarity(profile.location, job.location);
      if (locationScore > 50) matchReasons.push("Location match");

      // Skills score (30% weight)
      const skillScore = skillMatching(profile.skills, job.description);
      if (skillScore > 60) matchReasons.push("Skills match");

      // Salary score (20% weight)
      const salaryScore = salaryMatching(profile.salaryMin, job.salary);
      if (salaryScore === 100) matchReasons.push("Salary meets expectations");
      if (salaryScore >= 75) matchReasons.push("Salary is acceptable");

      // Title score (10% weight)
      const titleScore = titleRelevance(profile.title, job.title);
      if (titleScore > 40) matchReasons.push("Title is relevant");

      // Final weighted score
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
    .filter((match) => match.score >= 40) // Only jobs with 40%+ match
    .sort((a, b) => b.score - a.score);
}
