import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { listLocationStats } from "@/lib/seo/location-query";
import { locales, defaultLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/locale-path";

/** Smaller chunks = faster TTFB + smaller download for crawlers */
const JOBS_PER_SITEMAP = 500;
const MAX_JOB_CHUNKS = 80;

/** CDN / ISR-style cache for sitemap responses (seconds) */
export const revalidate = 3600;

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
    /** hreflang only where it matters (hubs). Jobs stay lean. */
    withAlternates?: boolean;
  } = {}
): MetadataRoute.Sitemap[0] {
  const base = getSiteUrl().replace(/\/$/, "");
  const item: MetadataRoute.Sitemap[0] = {
    url: `${base}${localizePath(pathname, defaultLocale)}`,
    lastModified: opts.lastModified || new Date(),
    changeFrequency: opts.changeFrequency || "weekly",
    priority: opts.priority ?? 0.5,
  };
  if (opts.withAlternates) {
    item.alternates = { languages: languageAlternates(pathname) };
  }
  return item;
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

  // ── id 0: static + hubs (with hreflang) ──────────────────────────
  if (id === 0) {
    const staticPaths = [
      "/",
      "/jobs",
      "/companies",
      "/locations",
      "/categories",
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
        withAlternates: true,
      })
    );

    const [posts, companies, locs, categories] = await Promise.all([
      db.blogPost
        .findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true, createdAt: true },
          orderBy: { updatedAt: "desc" },
          take: 500,
        })
        .catch(() => [] as { slug: string; updatedAt: Date; createdAt: Date }[]),
      db.company
        .findMany({
          where: { status: "active" },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 2000,
        })
        .catch(() => [] as { id: string; updatedAt: Date }[]),
      listLocationStats(1).catch(() => [] as { slug: string }[]),
      db.category
        .findMany({
          select: {
            slug: true,
            _count: { select: { jobs: { where: { status: "active" } } } },
          },
          take: 200,
        })
        .catch(
          () =>
            [] as {
              slug: string;
              _count: { jobs: number };
            }[]
        ),
    ]);

    const blogEntries = posts.map((p) =>
      entry(`/blog/${p.slug}`, {
        lastModified: p.updatedAt || p.createdAt,
        changeFrequency: "weekly",
        priority: 0.55,
        withAlternates: true,
      })
    );

    const companyEntries = companies.map((c) =>
      entry(`/companies/${c.id}`, {
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
        withAlternates: false,
      })
    );

    const locationEntries = locs.map((l) =>
      entry(`/locations/${l.slug}`, {
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
        withAlternates: true,
      })
    );

    const categoryEntries = categories
      .filter((c) => c._count.jobs > 0)
      .map((c) =>
        entry(`/categories/${c.slug}`, {
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.7,
          withAlternates: true,
        })
      );

    return [
      ...staticPages,
      ...locationEntries,
      ...categoryEntries,
      ...companyEntries,
      ...blogEntries,
    ];
  }

  // ── id >= 1: job chunks (no hreflang → ~5–8× smaller) ────────────
  const chunkIndex = id - 1;
  const skip = chunkIndex * JOBS_PER_SITEMAP;

  try {
    const jobs = await db.job.findMany({
      where: { status: "active" },
      select: { id: true, updatedAt: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip,
      take: JOBS_PER_SITEMAP,
    });

    return jobs.map((j) =>
      entry(`/jobs/${j.id}`, {
        lastModified: j.updatedAt,
        changeFrequency: "daily",
        priority: 0.8,
        withAlternates: false,
      })
    );
  } catch {
    return [];
  }
}
