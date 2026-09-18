import type {
  AdapterFetchOptions,
  AdapterFetchResult,
  IngestJobDraft,
  JobSourceAdapter,
} from "../types";
import { stripHtml } from "@/lib/jobs/sync-normalize";

const API = "https://www.arbeitnow.com/api/job-board-api";
const TIMEOUT_MS = 12_000;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, max = 50_000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function mapItem(item: unknown): IngestJobDraft | null {
  const j = asRecord(item);
  if (!j) return null;
  const slug = str(j.slug, 200);
  const title = str(j.title, 300).trim();
  const company = str(j.company_name, 200).trim();
  if (!slug || !title || !company) return null;

  const url = str(j.url, 2000) || `https://www.arbeitnow.com/jobs/${slug}`;
  const rawHtml = str(j.description, 200_000);
  const description = stripHtml(rawHtml) || title;
  const tags = asArray(j.tags).map((t) => str(t, 80)).filter(Boolean);
  const jobTypes = asArray(j.job_types).map((t) => str(t, 40)).filter(Boolean);
  const created =
    typeof j.created_at === "number" ? new Date(j.created_at * 1000) : null;

  return {
    sourceKey: "arbeitnow",
    sourceJobId: slug,
    externalId: `arbeitnow:${slug}`,
    title,
    company,
    location: str(j.location, 300) || "Remote",
    description,
    descriptionIsSnippet: false,
    applyUrl: url,
    externalUrl: url,
    remote: Boolean(j.remote),
    employmentType: jobTypes[0] || "full-time",
    tags,
    skills: tags,
    publishedAt: created,
    attribution: "Jobs via Arbeitnow",
  };
}

export const arbeitnowAdapter: JobSourceAdapter = {
  key: "arbeitnow",
  async fetchPage(options: AdapterFetchOptions = {}): Promise<AdapterFetchResult> {
    const page = options.page ?? 1;
    const perPage = Math.min(options.perPage ?? 100, 100);
    const url = new URL(API);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(perPage));

    const errors: string[] = [];
    try {
      const res = await fetchWithTimeout(url.toString(), options.signal);
      if (!res.ok) {
        errors.push(`http_${res.status}`);
        return { jobs: [], hasMore: false, fetched: 0, errors };
      }
      const data: unknown = await res.json();
      const list = Array.isArray(data) ? data : asArray(asRecord(data)?.data);
      const jobs = list.map(mapItem).filter((j): j is IngestJobDraft => Boolean(j));
      return {
        jobs,
        fetched: list.length,
        hasMore: list.length >= perPage,
        nextCursor: null,
        errors,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "fetch_failed");
      return { jobs: [], hasMore: false, fetched: 0, errors };
    }
  },
};
