"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  Wifi,
  WifiOff,
  Briefcase,
  Calendar,
  ChevronDown,
  Loader2,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Layers,
} from "lucide-react";

interface ApiJob {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string;
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
  };
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
}

const jobTypes = [
  { value: "", label: "All Types" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
];

const experiences = [
  { value: "", label: "All Levels" },
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

const postedOptions = [
  { value: "", label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "salary-high", label: "Salary: High to Low" },
  { value: "salary-low", label: "Salary: Low to High" },
];

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "Today";
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdvancedSearchPage() {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [experience, setExperience] = useState("");
  const [remote, setRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [postedWithin, setPostedWithin] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (experience) params.set("experience", experience);
    if (remote) params.set("remote", "true");
    if (salaryMin) params.set("salaryMin", salaryMin);
    if (salaryMax) params.set("salaryMax", salaryMax);
    if (postedWithin) params.set("postedWithin", postedWithin);
    if (sortBy) params.set("sortBy", sortBy);

    fetch(`/api/jobs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, type, experience, remote, salaryMin, salaryMax, postedWithin, sortBy]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const clearFilters = () => {
    setSearch("");
    setType("");
    setExperience("");
    setRemote(false);
    setSalaryMin("");
    setSalaryMax("");
    setPostedWithin("");
    setSortBy("newest");
  };

  const activeFiltersCount =
    (search ? 1 : 0) +
    (type ? 1 : 0) +
    (experience ? 1 : 0) +
    (remote ? 1 : 0) +
    (salaryMin ? 1 : 0) +
    (salaryMax ? 1 : 0) +
    (postedWithin ? 1 : 0);

  const toggleSave = (id: string) => {
    setSavedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Advanced Search</h1>
          <p className="text-slate-400 text-sm">Find your perfect job with powerful filters</p>
        </div>

        {/* Search Bar */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, companies, skills..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {filtersOpen && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Job Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {jobTypes.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-800">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {experiences.map((e) => (
                    <option key={e.value} value={e.value} className="bg-slate-800">
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Posted</label>
                <select
                  value={postedWithin}
                  onChange={(e) => setPostedWithin(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {postedOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={() => setRemote(!remote)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                    remote
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}
                >
                  {remote ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  Remote Only
                </button>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Min Salary</label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Max Salary</label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="150000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white py-2 rounded-xl text-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            {loading ? "Searching..." : `${jobs.length} result${jobs.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const displayTags = job.tags.filter((t) => !t.startsWith("http")).slice(0, 4);
              return (
                <div
                  key={job.id}
                  className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                        <span className="text-cyan-400 font-bold text-xs">
                          {getLogo(job.company.name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm line-clamp-1">{job.title}</h3>
                        <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {job.company.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(job.id)}
                      className={`p-2 rounded-lg transition-all ${
                        savedJobs.includes(job.id)
                          ? "bg-red-500/10 text-red-400"
                          : "bg-white/5 text-slate-400 hover:text-red-400"
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={savedJobs.includes(job.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {job.currency}
                      {(job.salaryMin ?? 0).toLocaleString()} - {(job.salaryMax ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {displayTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5 break-all max-w-[100px] truncate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                    <span className="text-[10px] text-slate-500">{timeAgo(job.createdAt)}</span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">No jobs found</p>
            <p className="text-slate-400 text-sm mb-6">Try adjusting your search criteria</p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
