import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { MapPin } from "lucide-react";
import { listLocationStats } from "@/lib/seo/location-query";
import {
  buildPublicMetadata,
  jsonLdScript,
} from "@/lib/seo/core";
import { itemListJsonLd } from "@/lib/seo/json-ld";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

export const revalidate = 300;

export const metadata: Metadata = buildPublicMetadata({
  title: "Jobs by location",
  description:
    "Browse active job listings by country and city on Global Job Matching. Only locations with real open roles are listed.",
  path: "/locations",
  index: true,
  hreflang: true,
});

export default async function LocationsIndexPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const stats = await listLocationStats(1);

  const title = t(dict, "Locations.title", "Jobs by location");
  const subtitle = t(
    dict,
    "Locations.subtitle",
    "These pages only appear when there is at least one active job matching that location in our database — no empty doorway pages."
  );
  const empty = t(
    dict,
    "Locations.empty",
    "No location hubs with active jobs yet. Check back soon or"
  );
  const browseJobs = t(dict, "Locations.browseJobs", "browse all jobs");
  const activeJobs = t(dict, "Locations.activeJobs", "active jobs");
  const viewAll = t(dict, "Locations.viewAllJobs", "View all jobs →");
  const browseCat = t(
    dict,
    "Locations.browseCategories",
    "Browse categories →"
  );

  const listLd = itemListJsonLd({
    name: title,
    description: subtitle,
    path: "/locations",
    items: stats.map((loc) => ({
      name: loc.name,
      path: `/locations/${loc.slug}`,
    })),
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(listLd) }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <MapPin className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">{subtitle}</p>
        </div>

        {stats.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10 text-slate-400">
            {empty}{" "}
            <Link href="/jobs" className="text-cyan-400 hover:underline">
              {browseJobs}
            </Link>
            .
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {stats.map((loc) => (
              <li key={loc.slug}>
                <Link
                  href={`/locations/${loc.slug}`}
                  className="glass block rounded-2xl border border-white/10 p-5 hover:border-cyan-500/30 transition-all"
                >
                  <span className="text-lg font-semibold text-white">
                    {loc.name}
                  </span>
                  <span className="block text-sm text-slate-400 mt-1">
                    {loc.count} {activeJobs}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center mt-10 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/jobs" className="text-cyan-400 hover:underline">
            {viewAll}
          </Link>
          <Link href="/categories" className="text-cyan-400 hover:underline">
            {browseCat}
          </Link>
        </p>
      </div>
    </main>
  );
}
