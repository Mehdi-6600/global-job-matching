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

export async function fetchAllJobs(
  title: string,
  location: string
): Promise<JobListing[]> {
  try {
    // Fetch from Arbeitnow
    const response = await fetch(
      `https://www.arbeitnow.com/api/v2/jobs?location=${encodeURIComponent(location)}`
    );
    const data = await response.json();
    
    return (data.data || []).slice(0, 10).map((job: any) => ({
      id: `arbeitnow-${job.id}`,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || undefined,
      description: job.description?.substring(0, 200) || "No description",
      url: job.url,
      source: "arbeitnow" as const,
      postedAt: new Date(job.created_at),
    }));
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}
