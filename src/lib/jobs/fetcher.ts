import axios from "axios";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: "arbeitnow" | "jooble" | "remoteok";
  postedAt: Date;
}

// Arbeitnow API
export async function fetchFromArbeitnow(
  location: string
): Promise<JobListing[]> {
  try {
    const response = await axios.get(
      `https://www.arbeitnow.com/api/v2/jobs?location=${encodeURIComponent(
        location
      )}`
    );
    return response.data.data.map((job: any) => ({
      id: `arbeitnow-${job.id}`,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || undefined,
      description: job.description.substring(0, 300),
      url: job.url,
      source: "arbeitnow" as const,
      postedAt: new Date(job.created_at),
    }));
  } catch (error) {
    console.error("Arbeitnow fetch error:", error);
    return [];
  }
}

// Jooble API (requires key, but has free tier)
export async function fetchFromJooble(
  title: string,
  location: string
): Promise<JobListing[]> {
  try {
    const response = await axios.post("https://api.jooble.org/api/v2/search", {
      keywords: title,
      location: location,
      pageNum: 1,
    });

    return response.data.jobs.map((job: any) => ({
      id: `jooble-${job.id}`,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: undefined,
      description: job.snippet.substring(0, 300),
      url: job.link,
      source: "jooble" as const,
      postedAt: new Date(job.updated),
    }));
  } catch (error) {
    console.error("Jooble fetch error:", error);
    return [];
  }
}

// RemoteOK API (free, no key needed)
export async function fetchFromRemoteOK(): Promise<JobListing[]> {
  try {
    const response = await axios.get("https://remoteok.com/api");
    return response.data
      .slice(1, 50)
      .map((job: any) => ({
        id: `remoteok-${job.id}`,
        title: job.title,
        company: job.company,
        location: "Remote",
        salary: job.salary_max ? `$${job.salary_max}/year` : undefined,
        description: job.description.substring(0, 300),
        url: job.url,
        source: "remoteok" as const,
        postedAt: new Date(job.posted_at * 1000),
      }));
  } catch (error) {
    console.error("RemoteOK fetch error:", error);
    return [];
  }
}

export async function fetchAllJobs(
  title: string,
  location: string
): Promise<JobListing[]> {
  const [arbeitnow, jooble, remoteok] = await Promise.all([
    fetchFromArbeitnow(location),
    fetchFromJooble(title, location),
    fetchFromRemoteOK(),
  ]);

  return [...arbeitnow, ...jooble, ...remoteok].sort(
    (a, b) => b.postedAt.getTime() - a.postedAt.getTime()
  );
}
