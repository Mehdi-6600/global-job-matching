"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  DollarSign,
  Building2,
  Heart,
  Wifi,
  WifiOff,
  Loader2,
  RotateCcw,
  ArrowRight,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

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

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function interpolate(
  template: string,
  replacements: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

export default function AdvancedSearchPage() {
  const { t, locale } = useLocale();
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

  const jobTypes = [
    { value: "", label: t("Jobs.allTypes", "All Types") },
    { value: "full-time", label: t("Jobs.types.fullTime", "Full-time") },
    { value: "part-time", label: t("Jobs.types.partTime", "Part-time") },
    { value: "contract", label: t("Jobs.types.contract", "Contract") },
    { value: "freelance", label: t("Jobs.types.freelance", "Freelance") },
    { value: "internship", label: t("Jobs.types.internship", "Internship") },
  ];

  const experiences = [
    { value: "", label: t("Jobs.anyExperience", "Any experience") },
    {
      value: "entry",
      label: t("Jobs.experienceLevels.entry", "Entry Level"),
    },
    { value: "mid", label: t("Jobs.experienceLevels.mid", "Mid Level") },
    {
      value: "senior",
      label: t("Jobs.experienceLevels.senior", "Senior Level"),
    },
    {
      value: "lead",
      label: t("Jobs.experienceLevels.lead", "Lead / Manager"),
    },
    {
      value: "executive",
      label: t("Jobs.experienceLevels.executive", "Executive"),
    },
  ];

  const postedOptions = [
    { value: "", label: t("Common.optional", "Any time") },
    {
      value: "1",
      label: t("Common.timeAgo.hoursAgo", "{count}h ago").replace(
        "{count}",
        "24"
      ),
    },
    {
      value: "3",
      label: t("Common.timeAgo.daysAgo", "{count}d ago").replace(
        "{count}",
        "3"
      ),
    },
    {
      value: "7",
      label: t("Common.timeAgo.daysAgo", "{count}d ago").replace(
        "{count}",
        "7"
      ),
    },
    {
      value: "30",
      label: t("Common.timeAgo.daysAgo", "{count}d ago").replace(
        "{count}",
        "30"
      ),
    },
  ];

  const sortOptions = [
    { value: "newest", label: t("JobDetail.posted", "Posted") + " ↓" },
    { value: "oldest", label: t("JobDetail.posted", "Posted") + " ↑" },
    {
      value: "salary-high",
      label: t("JobDetail.salary", "Salary") + " ↓",
    },
    {
      value: "salary-low",
      label: t("JobDetail.salary", "Salary") + " ↑",
    },
  ];

  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days > 30) {
      return interpolate(t("Common.timeAgo.months", "{count} months ago"), {
        count: Math.floor(days / 30),
      });
    }
    if (days > 1) {
      return interpolate(t("Common.timeAgo.days", "{count} days ago"), {
        count: days,
      });
    }
    if (days === 1) {
      return interpolate(t("Common.timeAgo.days", "{count} days ago"), {
        count: 1,
      });
    }
    return t("Common.timeAgo.justNow", "Just now");
  }

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
  }, [
    search,
    type,
    experience,
    remote,
    salaryMin,
    salaryMax,
    postedWithin,
    sortBy,
  ]);

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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {t("Jobs.title", "Jobs")}
          </h1>
          <p className="text-slate-400 text-sm">
            {t("Jobs.subtitle", "Find roles that match your skills")}
          </p>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-6 border border-white/10 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  "Jobs.searchPlaceholder",
                  "Job title, keywords..."
                )}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("Jobs.filters", "Filters")}
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={fetchJobs}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              {t("Common.search", "Search")}
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("Jobs.jobType", "Job Type")}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {jobTypes.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-slate-800"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("Jobs.experience", "Experience")}
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {experiences.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-slate-800"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("JobDetail.posted", "Posted")}
                </label>
                <select
                  value={postedWithin}
                  onChange={(e) => setPostedWithin(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {postedOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-slate-800"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setRemote(!remote)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                    remote
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}
                >
                  {remote ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  {t("Jobs.remoteOnly", "Remote Only")}
                </button>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("Jobs.minSalary", "Min Salary")}
                </label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder={t("Jobs.noLimit", "No limit")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("Jobs.maxSalary", "Max Salary")}
                </label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder={t("Jobs.noLimit", "No limit")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  {t("Common.search", "Sort")}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {sortOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-slate-800"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                    {t("Jobs.clearAll", "Clear all")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            {loading ? t("Common.loading", "Loading...") : `${jobs.length}`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const displayTags = (job.tags || []).slice(0, 4);
              const isSaved = savedJobs.includes(job.id);
              return (
                <div
                  key={job.id}
                  className="glass rounded-2xl p-5 border border-white/10 flex flex-col hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-300 text-xs font-bold shrink-0">
                        {job.company?.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.company.logo}
                            alt=""
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          getLogo(
                            job.company?.name ||
                              t("Jobs.companyFallback", "CO")
                          )
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {job.title}
                        </h3>
                        <p className="text-slate-400 text-xs flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {job.company?.name ||
                            t("Jobs.companyFallback", "Company")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSave(job.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                      aria-label={t("Common.save", "Save")}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isSaved
                            ? "fill-rose-400 text-rose-400"
                            : "text-slate-500"
                        }`}
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
                      {job.currency}{" "}
                      {(job.salaryMin ?? 0).toLocaleString(locale)}
                      {" - "}
                      {(job.salaryMax ?? 0).toLocaleString(locale)}
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
                    <span className="text-[10px] text-slate-500">
                      {timeAgo(job.createdAt)}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    >
                      {t("Common.view", "View")}{" "}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">
              {t("Jobs.noJobsFound", "No jobs found")}
            </p>
            <p className="text-slate-400 text-sm mb-6">
              {t("Jobs.tryAdjusting", "Try adjusting your search criteria")}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("Jobs.clearAll", "Clear all")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
