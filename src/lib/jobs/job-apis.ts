"use server";

export interface UnifiedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  url: string;
  tags: string[];
  postedAt: string;
  source: "arbeitnow" | "remoteok" | "jooble";
}

// ── Arbeitnow ───────────────────────────────────────────────────────────────
async function fetchArbeitnow(): Promise<UnifiedJob[]> {
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json) ? json : json.data || [];

    return data.slice(0, 20).map((job: any) => ({
      id: `an-${job.slug || job.id || Math.random().toString(36).slice(2)}`,
      title: job.title || "Untitled",
      company: job.company_name || "Unknown Company",
      location: job.location || "Remote",
      type: job.job_types?.[0] || "Full-time",
      salary: job.salary || "Not disclosed",
      description: job.description?.replace(/<[^>]+>/g, " ").slice(0, 300) + "..." || "",
      url: job.url || "#",
      tags: job.tags || [],
      postedAt: job.created_at || new Date().toISOString(),
      source: "arbeitnow" as const,
    }));
  } catch (err) {
    console.error("Arbeitnow fetch failed:", err);
    return [];
  }
}

// ── RemoteOK ────────────────────────────────────────────────────────────────
async function fetchRemoteOK(): Promise<UnifiedJob[]> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`RemoteOK ${res.status}`);
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : []; // first item is metadata

    return jobs.slice(0, 20).map((job: any) => ({
      id: `ro-${job.id || Math.random().toString(36).slice(2)}`,
      title: job.position || "Untitled",
      company: job.company || "Unknown Company",
      location: job.location || "Remote",
      type: "Remote",
      salary: job.salary || "Not disclosed",
      description: job.description?.replace(/<[^>]+>/g, " ").slice(0, 300) + "..." || "",
      url: job.apply_url || job.url || "#",
      tags: job.tags || [],
      postedAt: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      source: "remoteok" as const,
    }));
  } catch (err) {
    console.error("RemoteOK fetch failed:", err);
    return [];
  }
}

// ── Jooble ──────────────────────────────────────────────────────────────────
// Requires JOOBLE_API_KEY env variable
async function fetchJooble(): Promise<UnifiedJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    console.warn("JOOBLE_API_KEY not set — skipping Jooble");
    return [];
  }

  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: "developer", location: "remote", page: 1 }),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Jooble ${res.status}`);
    const json = await res.json();
    const jobs = json.jobs || [];

    return jobs.slice(0, 20).map((job: any) => ({
      id: `jb-${job.id || Math.random().toString(36).slice(2)}`,
      title: job.title || "Untitled",
      company: job.company || "Unknown Company",
      location: job.location || "Remote",
      type: "Full-time",
      salary: job.salary || "Not disclosed",
      description: job.snippet?.replace(/<[^>]+>/g, " ").slice(0, 300) + "..." || "",
      url: job.link || "#",
      tags: [],
      postedAt: job.updated ? new Date(job.updated).toISOString() : new Date().toISOString(),
      source: "jooble" as const,
    }));
  } catch (err) {
    console.error("Jooble fetch failed:", err);
    return [];
  }
}

// ── Aggregate ───────────────────────────────────────────────────────────────
export async function fetchAllJobs(): Promise<UnifiedJob[]> {
  const [arbeitnow, remoteok, jooble] = await Promise.all([
    fetchArbeitnow(),
    fetchRemoteOK(),
    fetchJooble(),
  ]);

  const all = [...arbeitnow, ...remoteok, ...jooble];

  // Sort by posted date (newest first)
  all.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  return all;
}

export async function fetchJobsByQuery(query: string, location?: string): Promise<UnifiedJob[]> {
  const all = await fetchAllJobs();
  const q = query.toLowerCase();
  return all.filter(
    (job) =>
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.tags.some((t) => t.toLowerCase().includes(q)) ||
      (location && job.location.toLowerCase().includes(location.toLowerCase()))
  );
}
