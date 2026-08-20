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

export async function fetchAllJobs(
  options: {
    page?: number;
    perPage?: number;
  } = {}
): Promise<FetchJobsResult> {
  const { page = 1, perPage = 100 } = options;
  const url = new URL(ARBEITNOW_API);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(perPage));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Arbeitnow API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const jobs: ArbeitnowJob[] = Array.isArray(data) ? data : data.data ?? [];

  return {
    jobs,
    total: jobs.length,
  };
}
