import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

/** Jobs per sitemap chunk (Google limit is 50k URLs / 50MB) */
const JOBS_PER_SITEMAP = 2000;
/** Hard ceiling so generateSitemaps stays bounded */
const MAX_JOB_CHUNKS = 40;

/**
 * id 0  → static + companies + blog + career tools
 * id 1+ → active jobs chunks
 */
export async function generateSitemaps() {
  let jobCount = 0;
  try {
    jobCount = await db.job.count({ where: { status: "active" } });
  } catch {
    jobCount = 0;
  }

  const jobChunks = Math.min(
    MAX_JOB_CHUNKS,
    Math.max(1, Math.ceil(Math.max(jobCount, 1) / JOBS_PER_SITEMAP))
  );

  const ids: { id: number }[] = [{ id: 0 }];
  for (let i = 1; i <= jobChunks; i++) {
    ids.push({ id: i });
  }
  return ids;
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  // --- Chunk 0: static + companies + blog ---
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
      {
        url: `${base}/jobs`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${base}/companies`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: `${base}/search`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      },
      {
        url: `${base}/pricing`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${base}/blog`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      },
      {
        url: `${base}/career-risk`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.55,
      },
      {
        url: `${base}/resume-builder`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.55,
      },
      {
        url: `${base}/about`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${base}/contact`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${base}/terms`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.3,
      },
      {
        url: `${base}/privacy`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.3,
      },
    ];

    let blogEntries: MetadataRoute.Sitemap = [];
    let companyEntries: MetadataRoute.Sitemap = [];

    try {
      const posts = await db.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000,
      });
      blogEntries = posts.map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updatedAt || p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      }));
    } catch {
      /* ignore */
    }

    try {
      const companies = await db.company.findMany({
        where: { status: "active" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      });
      companyEntries = companies.map((c) => ({
        url: `${base}/companies/${c.id}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    } catch {
      /* ignore */
    }

    return [...staticPages, ...companyEntries, ...blogEntries];
  }

  // --- Chunk 1+: jobs ---
  const chunkIndex = id - 1;
  const skip = chunkIndex * JOBS_PER_SITEMAP;

  try {
    const jobs = await db.job.findMany({
      where: { status: "active" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: JOBS_PER_SITEMAP,
    });

    return jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}
