"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  MapPin,
  Briefcase,
  Loader2,
  ArrowRight,
  Globe,
  Users,
  RotateCcw,
} from "lucide-react";

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
          setError(data.error || "Failed to load companies");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load companies");
        setLoading(false);
      });
  }, []);

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
          <p className="text-slate-400">Loading companies...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Browse Companies
          </h1>
          <p className="text-slate-400 text-sm">
            {filtered.length} compan{filtered.length !== 1 ? "ies" : "y"} found
          </p>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name, location, or industry..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((company) => (
              <div
                key={company.id}
                className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold text-sm">
                        {getLogo(company.name)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {company.name}
                      </h3>
                      {company.location && (
                        <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {company.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {company.description && (
                  <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-3">
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
                    {company.activeJobs} active job
                    {company.activeJobs !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/jobs?company=${company.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    View Jobs
                  </Link>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
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
            <p className="text-slate-400 font-medium mb-1">No companies found</p>
            <p className="text-slate-500 text-sm mb-6">
              Try adjusting your search
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Search
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
