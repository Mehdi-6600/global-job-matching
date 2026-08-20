import axios from "axios";

export interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

export interface FetchJobsResult {
  jobs: ArbeitnowJob[];
  total: number;
}

const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";

// ============================================
// ۱. دریافت از Arbeitnow
// ============================================
export async function fetchFromArbeitnow(
  options: { page?: number; perPage?: number } = {}
): Promise<ArbeitnowJob[]> {
  const { page = 1, perPage = 100 } = options;
  const url = new URL(ARBEITNOW_API);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(perPage));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.warn(`Arbeitnow API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

// ============================================
// ۲. دریافت از RemoteOK (رایگان، بدون کلید)
// ============================================
export async function fetchFromRemoteOK(): Promise<any[]> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slice(1, 50); // ۴۹ آگهی اول
  } catch {
    return [];
  }
}

// ============================================
// ۳. دریافت از Jooble (نیاز به API Key)
// ============================================
export async function fetchFromJooble(
  keyword: string = "developer",
  location: string = ""
): Promise<any[]> {
  const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;
  if (!JOOBLE_API_KEY) {
    console.warn("JOOBLE_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch("https://api.jooble.org/api/v2/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JOOBLE_API_KEY}`,
      },
      body: JSON.stringify({
        keywords: keyword,
        location: location,
        pageNum: 1,
      }),
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

// ============================================
// ۴. تابع اصلی (ترکیب همه منابع)
// ============================================
export async function fetchAllJobs(
  options: { page?: number; perPage?: number; keyword?: string; location?: string } = {}
): Promise<{ jobs: any[]; total: number; sources: { arbeitnow: number; remoteok: number; jooble: number } }> {
  const { page = 1, perPage = 50, keyword = "developer", location = "" } = options;

  // دریافت از همه منابع به صورت همزمان
  const [arbeitnowJobs, remoteOKJobs, joobleJobs] = await Promise.all([
    fetchFromArbeitnow({ page, perPage }),
    fetchFromRemoteOK(),
    fetchFromJooble(keyword, location),
  ]);

  // نرمال‌سازی داده‌ها
  const normalizeArbeitnow = arbeitnowJobs.map((job) => ({
    id: `arbeitnow-${job.slug}`,
    title: job.title,
    company: job.company_name,
    location: job.location || "Remote",
    salary: undefined,
    description: job.description?.substring(0, 300) || "",
    url: job.url,
    source: "arbeitnow" as const,
    postedAt: new Date(job.created_at * 1000),
  }));

  const normalizeRemoteOK = remoteOKJobs.map((job) => ({
    id: `remoteok-${job.id}`,
    title: job.title,
    company: job.company,
    location: "Remote",
    salary: job.salary_max ? `$${job.salary_max}/year` : undefined,
    description: job.description?.substring(0, 300) || "",
    url: job.url,
    source: "remoteok" as const,
    postedAt: new Date(job.posted_at * 1000),
  }));

  const normalizeJooble = joobleJobs.map((job) => ({
    id: `jooble-${job.id}`,
    title: job.title,
    company: job.company,
    location: job.location || "Remote",
    salary: undefined,
    description: job.snippet?.substring(0, 300) || "",
    url: job.link,
    source: "jooble" as const,
    postedAt: new Date(job.updated),
  }));

  const allJobs = [...normalizeArbeitnow, ...normalizeRemoteOK, ...normalizeJooble];

  return {
    jobs: allJobs,
    total: allJobs.length,
    sources: {
      arbeitnow: normalizeArbeitnow.length,
      remoteok: normalizeRemoteOK.length,
      jooble: normalizeJooble.length,
    },
  };
}
