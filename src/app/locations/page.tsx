import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { absoluteUrl } from "@/lib/site-url";
import { listLocationStats } from "@/lib/seo/location-query";
import { jsonLdScript, DEFAULT_OG_PATH } from "@/lib/seo/core";
import { itemListJsonLd } from "@/lib/seo/json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Jobs by location",
  description:
    "Browse active job listings by country and city on Global Job Matching. Only locations with real open roles are listed.",
  alternates: { canonical: absoluteUrl("/locations") },
  openGraph: {
    title: "Jobs by location | Global Job Matching",
    description: "Explore open roles by location with live job counts.",
    url: absoluteUrl("/locations"),
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_PATH),
        width: 1200,
        height: 630,
        alt: "Jobs by location",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jobs by location | Global Job Matching",
    description: "Explore open roles by location with live job counts.",
    images: [absoluteUrl(DEFAULT_OG_PATH)],
  },
  robots: { index: true, follow: true },
};

export default async function LocationsIndexPage() {
  const stats = await listLocationStats(1);

  const listLd = itemListJsonLd({
    name: "Jobs by location",
    description:
      "Location hubs with at least one active job on Global Job Matching.",
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Jobs by location
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            These pages only appear when there is at least one active job
            matching that location in our database — no empty doorway pages.
          </p>
        </div>

        {stats.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10 text-slate-400">
            No location hubs with active jobs yet. Check back soon or{" "}
            <Link href="/jobs" className="text-cyan-400 hover:underline">
              browse all jobs
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
                    {loc.count} active job{loc.count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center mt-10 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/jobs" className="text-cyan-400 hover:underline">
            View all jobs →
          </Link>
          <Link href="/categories" className="text-cyan-400 hover:underline">
            Browse categories →
          </Link>
        </p>
      </div>
    </main>
  );
}
