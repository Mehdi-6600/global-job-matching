"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Loader2,
  ArrowLeft,
  Trash2,
  Bookmark,
  Search,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface SavedJob {
  id: string;
  title: string;
  location: string;
  remote: boolean;
  type: string;
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
}

// تابع کمکی برای جایگزینی متغیرها در متن ترجمه‌شده
function interpolate(template: string, replacements: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

function getLogo(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
  notSpecified: string
) {
  const cur = currency || "USD";
  if (min == null && max == null) return notSpecified;
  if (min != null && max != null && min !== max) {
    return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `${cur} ${min.toLocaleString()}`;
  return `${cur} ${max!.toLocaleString()}`;
}

export default function SavedJobsPage() {
  const { t, locale } = useLocale();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  // تابع timeAgo با ترجمه
  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (months > 0) {
      const template = t("Common.timeAgo.months", "{count} months ago");
      return interpolate(template, { count: months });
    }
    if (days > 0) {
      const template = t("Common.timeAgo.days", "{count} days ago");
      return interpolate(template, { count: days });
    }
    if (hours > 0) {
      const template = t("Common.timeAgo.hours", "{count} hours ago");
      return interpolate(template, { count: hours });
    }
    if (minutes > 0) {
      const template = t("Common.timeAgo.minutes", "{count} minutes ago");
      return interpolate(template, { count: minutes });
    }
    return t("Common.timeAgo.justNow", "Just now");
  }

  useEffect(() => {
    fetch("/api/saved-jobs")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/saved-jobs";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.jobs) {
          setJobs(data.jobs);
        } else {
          setError(data.error || t("SavedJobs.errorLoad", "Failed to load saved jobs"));
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t("SavedJobs.errorLoad", "Failed to load saved jobs"));
        setLoading(false);
      });
  }, [t]);

  const handleRemove = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      const res = await fetch("/api/saved-jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t("SavedJobs.loading", "Loading saved jobs...")}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-sm">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <Link
            href="/login?callbackUrl=/saved-jobs"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
          >
            {t("Common.signIn", "Sign in")}
          </Link>
        </div>
      </main>
    );
  }

  // دریافت متن ترجمه‌شده و جایگزینی متغیرها
  const countTemplate = t("SavedJobs.count", "{count} job{plural} saved");
  const countLabel = interpolate(countTemplate, {
    count: jobs.length,
    plural: jobs.length !== 1 ? "s" : "",
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Common.back", "Back to Dashboard")}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {t("SavedJobs.title", "Saved Jobs")}
            </h1>
          </div>
          <p className="text-slate-400 text-sm">{countLabel}</p>
        </div>

        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const salaryText = formatSalary(
                job.currency,
                job.salaryMin,
                job.salaryMax,
                t("Common.notSpecified", "Not specified")
              );
              return (
                <div
                  key={job.id}
                  className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all relative"
                >
                  <button
                    type="button"
                    onClick={() => handleRemove(job.id)}
                    disabled={removingId === job.id}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all z-10"
                    title={t("SavedJobs.remove", "Remove")}
                  >
                    {removingId === job.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex items-start gap-3 mb-4 pr-8">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 font-bold text-xs">
                        {getLogo(job.company?.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">
                        {job.title}
                      </h3>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {job.company?.name || t("Common.companyFallback", "Company")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {salaryText}
                    </span>
                    {job.type && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.type}
                      </span>
                    )}
                    {job.remote && (
                      <span className="text-emerald-400">{t("Common.remote", "Remote")}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {(job.tags || [])
                      .filter((tag) => !tag.startsWith("http"))
                      .slice(0, 5)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      {timeAgo(job.createdAt)}
                    </span>
                    <Link
                      href={`/${locale}/jobs/${job.id}`}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium"
                    >
                      {t("SavedJobs.viewJob", "View Job")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">{t("SavedJobs.emptyTitle", "No saved jobs yet")}</p>
            <p className="text-slate-500 text-sm mb-6">
              {t("SavedJobs.emptyDesc", "Browse jobs and save the ones you like")}
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              {t("SavedJobs.browseJobs", "Browse Jobs")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
