"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  DollarSign,
  Filter,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Globe,
  Tag,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  createdAt: string;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
  } | null;
  category: { name: string; slug: string } | null;
}

interface Filters {
  search: string;
  location: string;
  type: string;
  experience: string;
  remote: boolean;
  minSalary: string;
  maxSalary: string;
  tag: string;
}

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
) {
  const cur = currency || "USD";
  if (min == null && max == null) return "Salary not specified";
  if (min != null && max != null) {
    return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `From ${cur} ${min.toLocaleString()}`;
  return `Up to ${cur} ${max!.toLocaleString()}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    location: "",
    type: "",
    experience: "",
    remote: false,
    minSalary: "",
    maxSalary: "",
    tag: "",
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (filters.search) params.set("search", filters.search);
    if (filters.location) params.set("location", filters.location);
    if (filters.type) params.set("type", filters.type);
    if (filters.experience) params.set("experience", filters.experience);
    if (filters.remote) params.set("remote", "true");
    if (filters.minSalary) params.set("minSalary", filters.minSalary);
    if (filters.maxSalary) params.set("maxSalary", filters.maxSalary);
    if (filters.tag) params.set("tag", filters.tag);

    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({
      search: "",
      location: "",
      type: "",
      experience: "",
      remote: false,
      minSalary: "",
      maxSalary: "",
      tag: "",
    });
    setPage(1);
  }

  const hasFilters =
    filters.search ||
    filters.location ||
    filters.type ||
    filters.experience ||
    filters.remote ||
    filters.minSalary ||
    filters.maxSalary ||
    filters.tag;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Find Your Dream Job
          </h1>
          <p className="text-slate-400">
            Search through thousands of opportunities
          </p>
        </div>

        <div className="glass rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Job title, keywords, or company..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters || hasFilters
                  ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="City or country..."
                    value={filters.location}
                    onChange={(e) => updateFilter("location", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Job Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter("type", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Experience
                </label>
                <select
                  value={filters.experience}
                  onChange={(e) => updateFilter("experience", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Any Experience</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead / Manager</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tag
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. React, Python..."
                    value={filters.tag}
                    onChange={(e) => updateFilter("tag", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Min Salary
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minSalary}
                    onChange={(e) => updateFilter("minSalary", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Max Salary
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    placeholder="No limit"
                    value={filters.maxSalary}
                    onChange={(e) => updateFilter("maxSalary", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all w-full">
                  <input
                    type="checkbox"
                    checked={filters.remote}
                    onChange={(e) => updateFilter("remote", e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Remote Only</span>
                  </div>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium w-full justify-center"
                >
                  <X className="w-4 h-4" /> Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">
              No jobs found
            </h3>
            <p className="text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="glass rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <CompanyLogo
                      name={job.company?.name}
                      logo={job.company?.logo}
                      size={48}
                    />
                    {job.remote && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                        Remote
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <Building2 className="w-4 h-4" />
                    <span>{job.company?.name || "Company"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                    {job.type && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5">
                        {job.type}
                      </span>
                    )}
                    {job.experience && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5">
                        {job.experience}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-slate-300">
                      {formatSalary(
                        job.currency,
                        job.salaryMin,
                        job.salaryMax
                      )}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {job.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-400 px-4">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
