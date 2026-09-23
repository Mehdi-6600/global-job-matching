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
import { messageFromApiError } from "@/lib/api-error-i18n";

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

function interpolate(
  template: string,
  replacements: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(String(value));
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
  notSpecified: string,
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

  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (months > 0) {
      return interpolate(t("Common.timeAgo.months", "{count} months ago"), {
        count: months,
      });
    }
    if (days > 0) {
      return interpolate(t("Common.timeAgo.days", "{count} days ago"), {
        count: days,
      });
    }
    if (hours > 0) {
      return interpolate(t("Common.timeAgo.hours", "{count} hours ago"), {
        count: hours,
      });
    }
    if (minutes > 0) {
      return interpolate(t("Common.timeAgo.minutes", "{count} minutes ago"), {
        count: minutes,
      });
    }
    return t("Common.timeAgo.justNow", "Just now");
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/saved-jobs")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/saved-jobs";
          return null;
        }
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (cancelled) return null;
        return { res, data };
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        const { res, data } = payload;
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
        } else if (Array.isArray(data.jobs)) {
          setJobs(data.jobs as SavedJob[]);
        } else {
          setError(t("SavedJobs.errorLoad", "Failed to load saved jobs"));
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("SavedJobs.errorLoad", "Failed to load saved jobs"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
          <p className="text-slate-400">
            {t("SavedJobs.loading", "Loading saved jobs...")}
          </p>
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
          <div className="glass rounded-2xl p-5 gjm-card-accent gjm-card-accent--emerald">
            <div className="flex items-center gap-3 mb-2">
              <Bookmark className="w-7 h-7 text-cyan-400" />
              <h1 className="text-2xl md:text-3xl font
