import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Briefcase, Building2, Wifi } from "lucide-react";
import { getLocationDef, LOCATION_SEO } from "@/lib/seo/locations";
import {
  countJobsForLocation,
  listJobsForLocation,
  listLocationStats,
} from "@/lib/seo/location-query";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";
import { jsonLdScript, DEFAULT_OG_PATH } from "@/lib/seo/core";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { normalizeLocation } from "@/lib/location";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const def = getLocationDef(slug);
  if (!def) {
    return {
      title: "Location not found",
      robots: { index: false, follow: false },
    };
  }

  const count = await countJobsForLocation(def);
  if (count < 1) {
    return { title: def.name, robots: { index: false, follow: false } };
  }

  const title = `Jobs in ${def.name}`;
  const description = truncateMeta(
    `${count} active job${count === 1 ? "" : "s"} in ${def.name} on Global Job Matching. ${def.intro}`,
    160
  );
  const url = absoluteUrl(`/locations/${def.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
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
}

export default async function LocationJobsPage({ params }: Props) {
  const { slug } = await params;
  const def = getLocationDef(slug);
  if (!def) notFound();

  const [count, jobs, allStats] = await Promise.all([
    countJobsForLocation(def),
    listJobsForLocation(def, 30),
    listLocationStats(1),
  ]);

  if (count < 1) notFound();

  const related = allStats
    .filter((s) => s.slug !== def.slug)
    .slice(0, 6);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
    { name: def.name, path: `/locations/${def.slug}` },
  ]);

  const jobList = itemListJsonLd({
    name: `Jobs in ${def.name}`,
    description: def.intro,
    path: `/locations/${def.slug}`,
    items: jobs.map((job) => ({
      name: job.title,
      path: `/jobs/${job.id}`,
    })),
  });

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
          <Link href="/" className="hover:text-cyan-400">
            Home
          </Link>
          <span>/</span>
          <Link href="/locations" className="hover:text-cyan-400">
            Locations
          </Link>
          <span>/</span>
          <span className="text-slate-300">{def.name}</span>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">Location hub</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Jobs in {def.name}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            {def.intro}
          </p>
          <p className="text-slate-500 text-sm mt-3">
            <Briefcase className="w-4 h-4 inline mr-1" />
            {count} active listing{count === 1 ? "" : "s"} right now
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => {
            const loc =
              normalizeLocation(job.location) || job.location || "—";
            return (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="glass block rounded-2xl border border-white/10 p-5 h-full hover:border-cyan-500/30 transition-all"
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
                      {loc}
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
            );
          })}
        </ul>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">
              More locations
            </h2>
            <ul className="flex flex-wrap gap-2">
              {related.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    href={`/locations/${loc.slug}`}
                    className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                  >
                    {loc.name}
                    <span className="text-slate-500 ml-1">({loc.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/jobs" className="text-cyan-400 hover:underline">
            All jobs
          </Link>
          <Link href="/locations" className="text-cyan-400 hover:underline">
            All locations
          </Link>
          <Link href="/categories" className="text-cyan-400 hover:underline">
            Categories
          </Link>
          <Link href="/companies" className="text-cyan-400 hover:underline">
            Companies
          </Link>
        </div>
      </div>
    </main>
  );
}
