import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Building2,
  MapPin,
  Briefcase,
  Globe,
  Users,
  Search,
} from "lucide-react";
import { db } from "@/lib/db";
import { normalizeLocation } from "@/lib/location";
import { buildPublicMetadata } from "@/lib/seo/core";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

export const revalidate = 300;

export const metadata: Metadata = buildPublicMetadata({
  title: "Companies",
  description:
    "Browse companies hiring worldwide on Global Job Matching. Explore profiles and open roles.",
  path: "/companies",
  index: true,
  hreflang: true,
});

interface CompanyCard {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  logo: string | null;
  website: string | null;
  activeJobs: number;
}

function getLogoInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

async function loadCompanies(): Promise<CompanyCard[]> {
  try {
    const rows = await db.company.findMany({
      where: {
        status: "active",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        location: true,
        description: true,
        logo: true,
        website: true,
        _count: {
          select: {
            jobs: {
              where: { status: "active" },
            },
          },
        },
      },
    });

    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      location: normalizeLocation(c.location) || c.location,
      description: c.description,
      logo: c.logo,
      website: c.website,
      activeJobs: c._count.jobs,
    }));
  } catch (error) {
    console.error("Companies page load error:", error);
    return [];
  }
}

export default async function CompaniesPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const companies = await loadCompanies();

  const title = t(dict, "Companies.title", "Companies");
  const subtitle = t(
    dict,
    "Companies.subtitle",
    "Explore employers hiring on Global Job Matching"
  );
  const emptyTitle = t(dict, "Companies.noCompanies", "No companies found");
  const jobsLabel = t(dict, "Companies.jobs", "Jobs");
  const websiteLabel = t(dict, "Companies.website", "Website");
  const viewProfileLabel = t(dict, "Companies.viewProfile", "View profile");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400">{subtitle}</p>
        </div>

        {companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="glass rounded-2xl p-5 border border-white/10 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
                    {company.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      getLogoInitials(company.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white truncate">
                      {company.name}
                    </h2>
                    {company.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {company.location}
                      </p>
                    )}
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                    {company.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/5">
                    <Briefcase className="w-3 h-3" />
                    {company.activeJobs} {jobsLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs?company=${company.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    {viewProfileLabel}
                  </Link>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                      aria-label={websiteLabel}
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">{emptyTitle}</p>
            <p className="text-slate-500 text-sm mb-6">
              Companies will appear here once employers create profiles.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              Browse Jobs
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
