import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://global-job-matching.vercel.app"
  ).replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();
  const now = new Date();

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
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
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

  let jobEntries: MetadataRoute.Sitemap = [];
  let blogEntries: MetadataRoute.Sitemap = [];
  let companyEntries: MetadataRoute.Sitemap = [];

  try {
    const jobs = await db.job.findMany({
      where: { status: "active" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    jobEntries = jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // Build must not fail if DB is temporarily unreachable
  }

  try {
    const posts = await db.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, createdAt: true },
      take: 200,
    });
    blogEntries = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt || p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    }));
  } catch {
    // ignore
  }

  try {
    const companies = await db.company.findMany({
      where: { status: "active" },
      select: { id: true, updatedAt: true },
      take: 200,
    });
    companyEntries = companies.map((c) => ({
      url: `${base}/companies/${c.id}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // ignore
  }

  return [...staticPages, ...jobEntries, ...blogEntries, ...companyEntries];
}
