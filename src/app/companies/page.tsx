"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  Globe,
  Users,
  RotateCcw,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  website: string | null;
  location: string | null;
  size: string | null;
  description: string | null;
  logo: string | null;
  status: string;
  createdAt: string;
  activeJobs: number;
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CompaniesPage() {
  const { t } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          setCompanies(data.companies);
        } else {
          setError(
            data.error || t("Companies.noCompanies", "No companies found")
          );
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t("Common.error", "Something went wrong"));
        setLoading(false);
      });
  }, [t]);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.location && c.location.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [companies, search]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t("Common.loading", "Loading...")}</p>
        </div>
      </main>
    );
  }

  if (error && companies.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-cyan-500/20 text-cyan-300 px-4 py-2 rounded-xl text-sm"
          >
            {t("Common.retry", "Try again")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t("Companies.title", "Companies")}
          </h1>
          <p className="text-slate-400">
            {t(
              "Companies.subtitle",
              "Explore employers hiring on Global Job Matching"
            )}
          </p>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "Companies.searchPlaceholder",
              "Search companies..."
            )}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((company) => (
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
                      getLogo(company.name)
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
                  {company.size && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/5">
                      <Users className="w-3 h-3" />
                      {company.size}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs border border-white/5">
                    <Briefcase className="w-3 h-3" />
                    {company.activeJobs} {t("Companies.jobs", "Jobs")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs?company=${company.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    {t("Companies.viewProfile", "View profile")}
                  </Link>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                      aria-label={t("Companies.website", "Website")}
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
            <p className="text-slate-400 font-medium mb-1">
              {t("Companies.noCompanies", "No companies found")}
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {t("Jobs.tryAdjusting", "Try adjusting your search or filters")}
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("Jobs.clearAll", "Clear All")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
