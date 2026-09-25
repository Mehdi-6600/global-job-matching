import { db } from "@/lib/db";
import { normalizeLocation } from "@/lib/location";

const DEFAULT_LIMIT = 12;

export type PublicJobCard = {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  createdAt: string;
  source: string | null;
  attribution: string | null;
  externalUrl: string | null;
  applyUrl: string | null;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
  } | null;
  category: { name: string; slug: string } | null;
};

/**
 * First-page public jobs for SSR (Google-visible HTML).
 * Keep in sync with the empty-search branch of GET /api/jobs.
 */
export async function getPublicJobsPage(limit = DEFAULT_LIMIT): Promise<{
  jobs: PublicJobCard[];
  total: number;
  totalPages: number;
}> {
  try {
    const where = { status: "active" as const };
    const [rows, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(1, limit), 50),
        include: {
          company: {
            select: { id: true, name: true, logo: true, location: true },
          },
          category: {
            select: { name: true, slug: true },
          },
        },
      }),
      db.job.count({ where }),
    ]);

    const jobs: PublicJobCard[] = rows.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: normalizeLocation(job.location) || job.location || "",
      remote: job.remote,
      type: job.type,
      experience: job.experience,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency || "USD",
      tags: job.tags ?? [],
      createdAt:
        job.createdAt instanceof Date
          ? job.createdAt.toISOString()
          : String(job.createdAt),
      source: job.source ?? null,
      attribution: job.attribution ?? null,
      externalUrl: job.externalUrl ?? null,
      applyUrl: job.applyUrl ?? null,
      company: job.company
        ? {
            id: job.company.id,
            name: job.company.name,
            logo: job.company.logo,
            location:
              normalizeLocation(job.company.location) || job.company.location,
          }
        : null,
      category: job.category
        ? { name: job.category.name, slug: job.category.slug }
        : null,
    }));

    return {
      jobs,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (e) {
    console.error("getPublicJobsPage error:", e);
    return { jobs: [], total: 0, totalPages: 1 };
  }
}
