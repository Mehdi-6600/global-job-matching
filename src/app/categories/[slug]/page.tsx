import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers, MapPin, Building2, Wifi } from "lucide-react";
import { db } from "@/lib/db";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";
import { jsonLdScript } from "@/lib/seo/core";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { normalizeLocation } from "@/lib/location";

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
    const url = absoluteUrl(`/categories/${category.slug}`);

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${title} | Global Job Matching`,
        description,
        url,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Category", robots: { index: false, follow: false } };
  }
}

export default async function CategoryJobsPage({ params }: Props) {
  const { slug } = await params;

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

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    { name: category.name, path: `/categories/${category.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      <div className="max-w-5xl mx-auto">
        <nav className="text-xs text-slate-500 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-indigo-400">
            Home
          </Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-indigo-400">
            Categories
          </Link>
          <span>/</span>
          <span className="text-slate-300">{category.name}</span>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Layers className="w-5 h-5" />
            <span className="text-sm font-medium">Category</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {category.name} jobs
          </h1>
          <p className="text-slate-400 text-sm">
            {category._count.jobs} active listing
            {category._count.jobs === 1 ? "" : "s"} in this category
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
                      Remote
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/jobs" className="text-indigo-400 hover:underline">
            All jobs
          </Link>
          <Link href="/categories" className="text-indigo-400 hover:underline">
            All categories
          </Link>
        </div>
      </div>
    </main>
  );
}
