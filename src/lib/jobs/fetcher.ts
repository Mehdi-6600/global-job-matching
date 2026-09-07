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

export interface NormalizedExternalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: "arbeitnow" | "remoteok" | "jooble";
  postedAt: Date;
}

export interface FetchJobsResult {
  jobs: ArbeitnowJob[];
  total: number;
}

const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";
const DEFAULT_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: "error",
    });
  } finally {
    clearTimeout(timer);
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown, max = 2000): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

// ============================================
// ۱. Arbeitnow
// ============================================
export async function fetchFromArbeitnow(
  options: { page?: number; perPage?: number } = {}
): Promise<ArbeitnowJob[]> {
  const { page = 1, perPage = 100 } = options;
  const url = new URL(ARBEITNOW_API);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(Math.min(perPage, 100)));

  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`Arbeitnow API error: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    const list = Array.isArray(data)
      ? data
      : asArray(asRecord(data)?.data);

    return list
      .map((item) => {
        const j = asRecord(item);
        if (!j) return null;
        const slug = str(j.slug, 200);
        const title = str(j.title, 300);
        if (!slug || !title) return null;
        return {
          slug,
          company_name: str(j.company_name, 200) || "Unknown",
          title,
          description: str(j.description, 5000),
          remote: Boolean(j.remote),
          url: str(j.url, 1000),
          tags: asArray(j.tags).map((t) => str(t, 80)).filter(Boolean),
          job_types: asArray(j.job_types).map((t) => str(t, 80)).filter(Boolean),
          location: str(j.location, 200),
          created_at:
            typeof j.created_at === "number" ? j.created_at : Date.now() / 1000,
        } satisfies ArbeitnowJob;
      })
      .filter((x): x is ArbeitnowJob => x != null);
  } catch (error) {
    console.warn("Arbeitnow fetch failed:", error);
    return [];
  }
}

// ============================================
// ۲. RemoteOK
// ============================================
export async function fetchFromRemoteOK(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetchWithTimeout("https://remoteok.com/api", {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const list = asArray(data);
    // First row is metadata on RemoteOK
    return list
      .slice(1, 50)
      .map((row) => asRecord(row))
      .filter((x): x is Record<string, unknown> => x != null);
  } catch (error) {
    console.warn("RemoteOK fetch failed:", error);
    return [];
  }
}

// ============================================
// ۳. Jooble
// ============================================
export async function fetchFromJooble(
  keyword: string = "developer",
  location: string = ""
): Promise<Record<string, unknown>[]> {
  const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY?.trim();
  if (!JOOBLE_API_KEY) {
    return [];
  }

  try {
    const res = await fetchWithTimeout(
      "https://jooble.org/api/" + encodeURIComponent(JOOBLE_API_KEY),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keywords: keyword.slice(0, 120),
          location: location.slice(0, 120),
          page: 1,
        }),
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) return [];
    const data: unknown = await res.json();
    return asArray(asRecord(data)?.jobs)
      .map((row) => asRecord(row))
      .filter((x): x is Record<string, unknown> => x != null)
      .slice(0, 50);
  } catch (error) {
    console.warn("Jooble fetch failed:", error);
    return [];
  }
}

// ============================================
// ۴. ترکیب منابع
// ============================================
export async function fetchAllJobs(
  options: {
    page?: number;
    perPage?: number;
    keyword?: string;
    location?: string;
  } = {}
): Promise<{
  jobs: NormalizedExternalJob[];
  total: number;
  sources: { arbeitnow: number; remoteok: number; jooble: number };
}> {
  const {
    page = 1,
    perPage = 50,
    keyword = "developer",
    location = "",
  } = options;

  const [arbeitnowJobs, remoteOKJobs, joobleJobs] = await Promise.all([
    fetchFromArbeitnow({ page, perPage }),
    fetchFromRemoteOK(),
    fetchFromJooble(keyword, location),
  ]);

  const normalizeArbeitnow: NormalizedExternalJob[] = arbeitnowJobs.map(
    (job) => ({
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location || "Remote",
      salary: undefined,
      description: (job.description || "").substring(0, 300),
      url: job.url,
      source: "arbeitnow" as const,
      postedAt: new Date(job.created_at * 1000),
    })
  );

  const normalizeRemoteOK: NormalizedExternalJob[] = remoteOKJobs.map(
    (job) => {
      const id = str(job.id ?? job.slug, 80) || String(Math.random());
      const salaryMax = job.salary_max;
      return {
        id: `remoteok-${id}`,
        title: str(job.title, 300) || "Untitled",
        company: str(job.company, 200) || "Unknown",
        location: "Remote",
        salary:
          typeof salaryMax === "number" ? `$${salaryMax}/year` : undefined,
        description: str(job.description, 300),
        url: str(job.url, 1000),
        source: "remoteok" as const,
        postedAt: new Date(
          typeof job.date === "string" || typeof job.date === "number"
            ? job.date
            : Date.now()
        ),
      };
    }
  );

  const normalizeJooble: NormalizedExternalJob[] = joobleJobs.map((job) => {
    const id = str(job.id, 80) || str(job.link, 80) || String(Math.random());
    return {
      id: `jooble-${id}`,
      title: str(job.title, 300) || "Untitled",
      company: str(job.company, 200) || "Unknown",
      location: str(job.location, 200) || "Remote",
      salary: undefined,
      description: str(job.snippet ?? job.description, 300),
      url: str(job.link ?? job.url, 1000),
      source: "jooble" as const,
      postedAt: new Date(
        typeof job.updated === "string" || typeof job.updated === "number"
          ? job.updated
          : Date.now()
      ),
    };
  });

  // Deduplicate by title+company (case-insensitive)
  const seen = new Set<string>();
  const allJobs: NormalizedExternalJob[] = [];
  for (const job of [
    ...normalizeArbeitnow,
    ...normalizeRemoteOK,
    ...normalizeJooble,
  ]) {
    const key = `${job.title.toLowerCase()}::${job.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    allJobs.push(job);
  }

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
