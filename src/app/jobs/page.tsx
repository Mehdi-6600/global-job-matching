"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Bookmark,
  Filter,
  ChevronDown,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useJobs } from "@/hooks/use-jobs";

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Remote"];
const categories = [
  "All",
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Product",
  "Data",
];

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    arbeitnow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    remoteok: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    jooble: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return map[source] || "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/50 border-black/10 dark:border-white/10";
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  // Proper debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { jobs, loading, error, refetch } = useJobs(debouncedQuery);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesType =
        selectedType === "All" ||
        job.type.toLowerCase().includes(selectedType.toLowerCase()) ||
        (selectedType === "Remote" && job.location.toLowerCase().includes("remote"));
      const matchesCategory =
        selectedCategory === "All" ||
        job.tags.some((t) =>
          t.toLowerCase().includes(selectedCategory.toLowerCase())
        );
      return matchesType && matchesCategory;
    });
  }, [jobs, selectedType, selectedCategory]);

  const toggleSave = (id: string) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-100 dark:to-purple-200 bg-clip-text text-transparent mb-6">
            Find Your Dream Job
          </h1>
          <p className="text-lg text-slate-500 dark:text-white/60 max-w-2xl mx-auto mb-10">
            Browse thousands of real opportunities from Arbeitnow, RemoteOK, and
            Jooble — all in one place.
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 h-12">
                <Search className="w-5 h-5 text-slate-400 dark:text-white/40 mr-3" />
                <input
                  type="text"
                  placeholder="Job title, company, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 outline-none"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/60">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer bg-transparent"
              >
                {jobTypes.map((t) => (
                  <option key={t} value={t} className="bg-white dark:bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer bg-transparent"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 pointer-events-none" />
            </div>

            <span className="ml-auto text-sm text-slate-400 dark:text-white/40">
              {loading ? "Loading..." : `${filteredJobs.length} jobs found`}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 dark:text-white/50">
                Fetching jobs from multiple sources...
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Job Grid */}
          {!loading && !error && (
            <div className="grid gap-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass rounded-2xl p-6 hover:bg-black/[0.03] dark:hover:bg-white/[0.15] transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-black/5 dark:border-white/10 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-white/80">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate">
                          {job.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sourceBadge(
                            job.source
                          )}`}
                        >
                          {job.source}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-white/60 text-sm">
                        {job.company}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400 dark:text-white/50">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(job.postedAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/5 text-slate-600 dark:text-white/70 border border-black/5 dark:border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSave(job.id)}
                        className={`p-3 rounded-xl transition-all duration-300 ${
                          savedJobs.includes(job.id)
                            ? "bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30"
                            : "glass text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        <Bookmark
                          className={`w-5 h-5 ${
                            savedJobs.includes(job.id) ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <Link
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center gap-2"
                      >
                        Apply
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="glass rounded-2xl p-12 text-center">
                  <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 dark:text-white/60 mb-2">
                    No jobs found
                  </h3>
                  <p className="text-slate-400 dark:text-white/40">
                    Try adjusting your search or filters.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
