"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Loader2,
  MapPin,
  Building2,
  Clock,
  Eye,
  Users,
  XCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface ApplicationItem {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    remote: boolean;
    type: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    company: {
      id: string;
      name: string;
      logo: string | null;
      location: string | null;
    } | null;
  } | null;
}

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
) {
  const cur = currency || "USD";
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `${cur} ${min.toLocaleString()}`;
  return `${cur} ${max!.toLocaleString()}`;
}

export default function MyApplicationsPage() {
  const { t, locale } = useLocale();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // statusConfig با ترجمه
  const statusConfig = {
    pending: {
      label: t("Applications.statusPending", "Pending"),
      icon: <Clock className="w-3.5 h-3.5" />,
      bg: "bg-amber-500/10 border-amber-500/20",
      color: "text-amber-400",
    },
    applied: {
      label: t("Applications.statusPending", "Pending"),
      icon: <Clock className="w-3.5 h-3.5" />,
      bg: "bg-amber-500/10 border-amber-500/20",
      color: "text-amber-400",
    },
    viewed: {
      label: t("Applications.statusViewed", "Viewed"),
      icon: <Eye className="w-3.5 h-3.5" />,
      bg: "bg-blue-500/10 border-blue-500/20",
      color: "text-blue-400",
    },
    interview: {
      label: t("Applications.statusInterview", "Interview"),
      icon: <Users className="w-3.5 h-3.5" />,
      bg: "bg-cyan-500/10 border-cyan-500/20",
      color: "text-cyan-400",
    },
    rejected: {
      label: t("Applications.statusRejected", "Rejected"),
      icon: <XCircle className="w-3.5 h-3.5" />,
      bg: "bg-red-500/10 border-red-500/20",
      color: "text-red-400",
    },
    hired: {
      label: t("Applications.statusHired", "Hired"),
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      bg: "bg-emerald-500/10 border-emerald-500/20",
      color: "text-emerald-400",
    },
  };

  useEffect(() => {
    fetch("/api/applications")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/my-applications";
          return null;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t("Applications.errorLoad", "Failed to load"));
          setLoading(false);
          return;
        }
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t("Common.errorNetwork", "Network error"));
        setLoading(false);
      });
  }, [t]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to Dashboard")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Briefcase className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{t("Applications.title", "My Applications")}</h1>
            <p className="text-slate-400 text-sm">
              {t("Applications.count", "{count} application{plural}", {
                count: applications.length,
                plural: applications.length !== 1 ? "s" : "",
              })}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {applications.length === 0 && !error ? (
          <div className="glass rounded-2xl p-12 text-center border border-white/10">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">{t("Applications.empty", "No applications yet")}</p>
            <Link
              href="/jobs"
              className="inline-flex px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold"
            >
              {t("Applications.browseJobs", "Browse Jobs")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.pending;
              const salary = formatSalary(
                app.job?.currency,
                app.job?.salaryMin,
                app.job?.salaryMax
              );

              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 border border-white/10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      {app.job ? (
                        <Link
                          href={`/${locale}/jobs/${app.job.id}`}
                          className="text-white font-semibold hover:text-cyan-300 transition-colors"
                        >
                          {app.job.title}
                        </Link>
                      ) : (
                        <span className="text-white font-semibold">
                          {t("Applications.jobUnavailable", "Job unavailable")}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        {app.job?.company?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {app.job.company.name}
                          </span>
                        )}
                        {app.job?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.job.location}
                          </span>
                        )}
                        {salary && <span>{salary}</span>}
                      </div>
                      <p className="text-slate-600 text-xs mt-2">
                        {t("Applications.appliedOn", "Applied {date}", {
                          date: new Date(app.createdAt).toLocaleDateString(locale),
                        })}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 ${status.bg} ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
