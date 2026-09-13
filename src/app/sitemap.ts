import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { listLocationStats } from "@/lib/seo/location-query";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/locale-path";

const JOBS_PER_SITEMAP = 2000;
const MAX_JOB_CHUNKS = 40;

function languageAlternates(pathname: string): Record<string, string> {
  const base = getSiteUrl().replace(/\/$/, "");
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${base}${localizePath(pathname, locale)}`;
  }
  languages["x-default"] = `${base}${localizePath(pathname, defaultLocale)}`;
  return languages;
}

function entry(
  pathname: string,
  opts: {
    lastModified?: Date;
    changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"];
    priority?: number;
  } = {}
): MetadataRoute.Sitemap[0] {
  const base = getSiteUrl().replace(/\/$/, "");
  return {
    url: `${base}${localizePath(pathname, defaultLocale)}`,
    lastModified: opts.lastModified || new Date(),
    changeFrequency: opts.changeFrequency || "weekly",
    priority: opts.priority ?? 0.5,
    alternates: {
      languages: languageAlternates(pathname),
    },
  };
}

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

export default async function sitemap(props: {
  id: number | string;
}): Promise<MetadataRoute.Sitemap> {
  const id =
    typeof props.id === "string" ? parseInt(props.id, 10) : Number(props.id);
  const now = new Date();

  if (!Number.isFinite(id) || id < 0) {
    return [];
  }

  if (id === 0) {
    const staticPaths = [
      "/",
      "/jobs",
      "/companies",
      "/locations",
      "/categories",
      "/search",
      "/pricing",
      "/blog",
      "/career-risk",
      "/resume-builder",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
    ];

    const staticPages = staticPaths.map((p) =>
      entry(p, {
        lastModified: now,
        changeFrequency: p === "/" || p === "/jobs" ? "daily" : "weekly",
        priority: p === "/" ? 1 : p === "/jobs" ? 0.9 : 0.6,
      })
    );

    let blogEntries: MetadataRoute.Sitemap = [];
    let companyEntries: MetadataRoute.Sitemap = [];
    let locationEntries: MetadataRoute.Sitemap = [];
    let categoryEntries: MetadataRoute.Sitemap = [];

    try {
      const posts = await db.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000,
      });
      blogEntries = posts.map((p) =>
        entry(`/blog/${p.slug}`, {
          lastModified: p.updatedAt || p.createdAt,
          changeFrequency: "weekly",
          priority: 0.55,
        })
      );
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
      companyEntries = companies.map((c) =>
        entry(`/companies/${c.id}`, {
          lastModified: c.updatedAt,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      );
    } catch {
      /* ignore */
    }

    try {
      const locs = await listLocationStats(1);
      locationEntries = locs.map((l) =>
        entry(`/locations/${l.slug}`, {
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.7,
        })
      );
    } catch {
      /* ignore */
    }

    try {
      const categories = await db.category.findMany({
        select: {
          slug: true,
          _count: { select: { jobs: { where: { status: "active" } } } },
        },
        take: 200,
      });
      categoryEntries = categories
        .filter((c) => c._count.jobs > 0)
        .map((c) =>
          entry(`/categories/${c.slug}`, {
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
          })
        );
    } catch {
      /* ignore */
    }

    return [
      ...staticPages,
      ...locationEntries,
      ...categoryEntries,
      ...companyEntries,
      ...blogEntries,
    ];
  }

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

    return jobs.map((j) =>
      entry(`/jobs/${j.id}`, {
        lastModified: j.updatedAt,
        changeFrequency: "daily",
        priority: 0.8,
      })
    );
  } catch {
    return [];
  }
}
