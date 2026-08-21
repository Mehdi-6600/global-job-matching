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
    arbeitnow: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
    remoteok: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20",
    jooble: "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20",
    direct: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20",
  };
  return (
    map[source] ||
    "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-black/10 dark:border-white/10"
  );
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { jobs, loading, error, refetch } = useJobs(debouncedQuery);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesType =
        selectedType === "All" ||
        (job.type || "").toLowerCase().includes(selectedType.toLowerCase()) ||
        (selectedType === "Remote" &&
          (job.location || "").toLowerCase().includes("remote"));
      const matchesCategory =
        selectedCategory === "All" ||
        (job.tags || []).some((t) =>
          (t || "").toLowerCase().includes(selectedCategory.toLowerCase())
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
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Navbar />

      {/* Hero — Full Width Glass */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15 rounded-full blur-[100px]" />
          <div className="absolute top-40 -left-40 w-[400px] h-[400px] bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="glass-section p-8 sm:p-12 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Find Your <span className="gradient-text">Dream Job</span>
            </h1>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              Browse thousands of real opportunities from Arbeitnow, RemoteOK, and
              Jooble — all in one place.
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-glow">
                <div className="flex-1 flex items-center px-4 h-12">
                  <Search className="w-5 h-5 text-[var(--text-muted)] mr-3" />
                  <input
                    type="text"
                    placeholder="Job title, company, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                  />
                </div>
                <button
                  onClick={() => refetch()}
                  className="h-12 px-6 btn-primary flex items-center justify-center gap-2 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Results */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Filters Bar */}
          <div className="glass-section p-4 mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>

            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2.5 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 cursor-pointer bg-transparent"
              >
                {jobTypes.map((t) => (
                  <option key={t} value={t} className="bg-white dark:bg-slate-900">
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none glass rounded-xl px-4 py-2.5 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 cursor-pointer bg-transparent"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            <span className="ml-auto text-sm text-[var(--text-muted)]">
              {loading ? "Loading..." : `${filteredJobs.length} jobs found`}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="glass-section p-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#3B82F6] animate-spin mb-4" />
              <p className="text-[var(--text-muted)]">
                Fetching jobs from multiple sources...
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="glass-section p-12 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={refetch} className="btn-primary">
                Try Again
              </button>
            </div>
          )}

          {/* Job Grid */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card group cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-white shadow-glow shrink-0">
                      {(job.company || "??").slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[#3B82F6] transition-colors truncate">
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
                      <p className="text-sm text-[var(--text-muted)]">
                        {job.company}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {job.type || "Full-time"}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {job.salary}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(job.postedAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {(job.tags || []).slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="glass-pill"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleSave(job.id)}
                        className={`w-10 h-10 rounded-xl glass flex items-center justify-center transition-all ${
                          savedJobs.includes(job.id)
                            ? "text-[#3B82F6] glow-primary"
                            : "text-[var(--text-muted)] hover:text-[#3B82F6]"
                        }`}
                      >
                        <Bookmark
                          className={`w-5 h-5 ${
                            savedJobs.includes(job.id) ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <Link
                        href={job.url || "#"}
                        target="_blank"
                        className="h-10 px-5 btn-primary text-sm flex items-center gap-2 rounded-xl"
                      >
                        Apply
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="glass-section p-16 text-center">
                  <Briefcase className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    No jobs found
                  </h3>
                  <p className="text-[var(--text-muted)]">
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
