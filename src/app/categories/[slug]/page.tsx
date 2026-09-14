import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Layers, MapPin, Building2, Wifi } from "lucide-react";
import { db } from "@/lib/db";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";
import { jsonLdScript, DEFAULT_OG_PATH } from "@/lib/seo/core";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { categoryBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { normalizeLocation } from "@/lib/location";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await db.category.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        _count: { select: { jobs: { where: { status: "active" } } } },
      },
    });

    if (!category || category._count.jobs < 1) {
      return {
        title: "Category not found",
        robots: { index: false, follow: false },
      };
    }

    const title = `${category.name} jobs`;
    const description = truncateMeta(
      `${category._count.jobs} active ${category.name} job${
        category._count.jobs === 1 ? "" : "s"
      } on Global Job Matching.`,
      160
    );
    const path = `/categories/${category.slug}`;
    const url = absoluteUrl(path);

    return {
      title,
      description,
      alternates: {
        canonical: url,
        languages: buildHreflangLanguages(path),
      },
      openGraph: {
        title: `${title} | Global Job Matching`,
        description,
        url,
        images: [
          {
            url: absoluteUrl(DEFAULT_OG_PATH),
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [absoluteUrl(DEFAULT_OG_PATH)],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Category", robots: { index: false, follow: false } };
  }
}

export default async function CategoryJobsPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const category = await db.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { jobs: { where: { status: "active" } } } },
    },
  });

  if (!category || category._count.jobs < 1) notFound();

  const jobs = await db.job.findMany({
    where: { status: "active", categoryId: category.id },
    select: {
      id: true,
      title: true,
      location: true,
      remote: true,
      type: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const otherCategories = await db.category.findMany({
    where: {
      slug: { not: category.slug },
      jobs: { some: { status: "active" } },
    },
    select: {
      name: true,
      slug: true,
      _count: { select: { jobs: { where: { status: "active" } } } },
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  const breadcrumbs = breadcrumbJsonLd(
    categoryBreadcrumbs({ name: category.name, slug: category.slug })
  );

  const jobList = itemListJsonLd({
    name: `${category.name} jobs`,
    path: `/categories/${category.slug}`,
    items: jobs.map((job) => ({
      name: job.title,
      path: `/jobs/${job.id}`,
    })),
  });

  const homeLabel = t(dict, "Nav.home", "Home");
  const categoriesLabel = t(dict, "Categories.title", "Categories");
  const categoryLabel = t(dict, "Categories.title", "Category");
  const activeJobs = t(dict, "Categories.activeJobs", "active jobs");
  const remoteLabel = t(dict, "Common.remote", "Remote");
  const otherLabel = t(dict, "Categories.browseLocations", "Other categories");
  const viewAllJobs = t(dict, "Categories.viewAllJobs", "View all jobs →");
  const browseLocations = t(
    dict,
    "Categories.browseLocations",
    "Browse locations →"
  );
  const jobsWord = t(dict, "Nav.jobs", "Jobs");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jobList) }}
      />
      <div className="max-w-5xl mx-auto">
        <nav className="text-xs text-slate-500 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-indigo-400">
            {homeLabel}
          </Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-indigo-400">
            {categoriesLabel}
          </Link>
          <span>/</span>
          <span className="text-slate-300">{category.name}</span>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Layers className="w-5 h-5" />
            <span className="text-sm font-medium">{categoryLabel}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {category.name} — {jobsWord}
          </h1>
          <p className="text-slate-400 text-sm">
            {category._count.jobs} {activeJobs}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="glass block rounded-2xl border border-white/10 p-5 h-full hover:border-indigo-500/30 transition-all"
              >
                <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {job.title}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  {job.company?.name && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {job.company.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {normalizeLocation(job.location) || job.location || "—"}
                  </span>
                  {job.remote && (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" />
                      {remoteLabel}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {otherCategories.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">
              {otherLabel}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {otherCategories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors"
                  >
                    {c.name}
                    <span className="text-slate-500 ml-1">
                      ({c._count.jobs})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/jobs" className="text-indigo-400 hover:underline">
            {viewAllJobs}
          </Link>
          <Link href="/locations" className="text-indigo-400 hover:underline">
            {browseLocations}
          </Link>
        </div>
      </div>
    </main>
  );
}
