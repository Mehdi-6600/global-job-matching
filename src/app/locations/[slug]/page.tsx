import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MapPin, Building2, Wifi } from "lucide-react";
import { getLocationDef } from "@/lib/seo/locations";
import {
  countJobsForLocation,
  listJobsForLocation,
  listLocationStats,
} from "@/lib/seo/location-query";
import { absoluteUrl, truncateMeta } from "@/lib/site-url";
import { jsonLdScript, DEFAULT_OG_PATH } from "@/lib/seo/core";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { locationBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { normalizeLocation } from "@/lib/location";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

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
  const path = `/locations/${def.slug}`;
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
}

export default async function LocationJobsPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const def = getLocationDef(slug);
  if (!def) notFound();

  const [count, jobs, allStats] = await Promise.all([
    countJobsForLocation(def),
    listJobsForLocation(def, 30),
    listLocationStats(1),
  ]);

  if (count < 1) notFound();

  const related = allStats.filter((s) => s.slug !== def.slug).slice(0, 6);

  const breadcrumbs = breadcrumbJsonLd(
    locationBreadcrumbs({ name: def.name, slug: def.slug })
  );

  const jobList = itemListJsonLd({
    name: `Jobs in ${def.name}`,
    path: `/locations/${def.slug}`,
    items: jobs.map((job) => ({
      name: job.title,
      path: `/jobs/${job.id}`,
    })),
  });

  const homeLabel = t(dict, "Nav.home", "Home");
  const locationsLabel = t(dict, "Locations.title", "Locations");
  const activeJobs = t(dict, "Locations.activeJobs", "active jobs");
  const remoteLabel = t(dict, "Common.remote", "Remote");
  const moreLoc = t(dict, "Locations.browseCategories", "More locations");
  const allJobs = t(dict, "Locations.viewAllJobs", "View all jobs →");
  const allLocations = t(dict, "Locations.title", "All locations");
  const categoriesLabel = t(dict, "Categories.title", "Categories");
  const companiesLabel = t(dict, "Nav.companies", "Companies");
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
          <Link href="/" className="hover:text-cyan-400">
            {homeLabel}
          </Link>
          <span>/</span>
          <Link href="/locations" className="hover:text-cyan-400">
            {locationsLabel}
          </Link>
          <span>/</span>
          <span className="text-slate-300">{def.name}</span>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">{locationsLabel}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {jobsWord} — {def.name}
          </h1>
          <p className="text-slate-400 text-sm mb-2">
            {count} {activeJobs}
          </p>
          {def.intro ? (
            <p className="text-slate-500 text-sm max-w-2xl">{def.intro}</p>
          ) : null}
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => {
            const loc =
              normalizeLocation(job.location) || job.location || def.name;
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
                        {remoteLabel}
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
            <h2 className="text-lg font-semibold text-white mb-4">{moreLoc}</h2>
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
            {allJobs}
          </Link>
          <Link href="/locations" className="text-cyan-400 hover:underline">
            {allLocations}
          </Link>
          <Link href="/categories" className="text-cyan-400 hover:underline">
            {categoriesLabel}
          </Link>
          <Link href="/companies" className="text-cyan-400 hover:underline">
            {companiesLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
