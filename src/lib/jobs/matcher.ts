import type { JobListing } from "@prisma/client";

export interface UserProfile {
  title: string;
  skills: string[];
  city?: string;        // ← اضافه شد
  country?: string;     // ← اضافه شد
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

// Salary matching (با تبدیل Decimal به Number)
function salaryMatching(
  userMinSalary: number | undefined,
  jobSalaryMin: number | null | undefined,
  jobSalaryMax: number | null | undefined
): number {
  if (!userMinSalary) return 50; // neutral if user didn't specify

  // استفاده از میانگین حقوق یا حداقل حقوق
  let jobSalaryNum = 0;
  if (jobSalaryMin && jobSalaryMax) {
    jobSalaryNum = (jobSalaryMin + jobSalaryMax) / 2;
  } else if (jobSalaryMin) {
    jobSalaryNum = jobSalaryMin;
  } else if (jobSalaryMax) {
    jobSalaryNum = jobSalaryMax;
  } else {
    return 50; // neutral if job salary unknown
  }

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
  // ساخت موقعیت مکانی کاربر
  const profileLocation = [profile.city, profile.country]
    .filter(Boolean)
    .join(", ") || profile.city || profile.country || "";

  return jobs
    .map((job) => {
      const matchReasons: string[] = [];

      // ساخت موقعیت مکانی شغل
      const jobLocation = [job.city, job.country]
        .filter(Boolean)
        .join(", ") || job.city || job.country || "";

      // Location score (40% weight)
      const locationScore = locationSimilarity(profileLocation, jobLocation);
      if (locationScore > 50) matchReasons.push("Location match");

      // Skills score (30% weight)
      const skillScore = skillMatching(profile.skills, job.description);
      if (skillScore > 60) matchReasons.push("Skills match");

      // Salary score (20% weight) — با تبدیل Decimal به Number
      const salaryScore = salaryMatching(
        profile.salaryMin,
        job.salaryMin ? Number(job.salaryMin) : null,
        job.salaryMax ? Number(job.salaryMax) : null
      );
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
