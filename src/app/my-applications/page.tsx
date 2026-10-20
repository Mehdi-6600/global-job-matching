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
import { messageFromApiError } from "@/lib/api-error-i18n";

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

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
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

  const getStatusConfig = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; icon: React.ReactNode; bg: string; color: string }
    > = {
      pending: {
        label: t("Applications.statusPending", "Pending"),
        icon: <Clock className="w-3.5 h-3.5" />,
        bg: "bg-[var(--warning-soft)] border-[var(--warning)]",
        color: "text-[var(--warning)]",
      },
      applied: {
        label: t("Applications.statusPending", "Pending"),
        icon: <Clock className="w-3.5 h-3.5" />,
        bg: "bg-[var(--warning-soft)] border-[var(--warning)]",
        color: "text-[var(--warning)]",
      },
      viewed: {
        label: t("Applications.statusViewed", "Viewed"),
        icon: <Eye className="w-3.5 h-3.5" />,
        bg: "bg-[var(--info-soft)] border-[var(--info)]",
        color: "text-[var(--info)]",
      },
      interview: {
        label: t("Applications.statusInterview", "Interview"),
        icon: <Users className="w-3.5 h-3.5" />,
        bg: "bg-[var(--brand-primary-soft)] border-[var(--border)]",
        color: "text-[var(--brand-primary)]",
      },
      rejected: {
        label: t("Applications.statusRejected", "Rejected"),
        icon: <XCircle className="w-3.5 h-3.5" />,
        bg: "bg-[var(--error-soft)] border-[var(--error)]",
        color: "text-[var(--error)]",
      },
      hired: {
        label: t("Applications.statusHired", "Hired"),
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        bg: "bg-[var(--success-soft)] border-[var(--success)]",
        color: "text-[var(--success)]",
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/applications")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/my-applications";
          return null;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
          setLoading(false);
          return;
        }
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("Common.errorNetwork", "Network error"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="gjm-page flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
      </div>
    );
  }

  const countTemplate = t("Applications.count", "{count} application{plural}");
  const countLabel = interpolate(countTemplate, {
    count: applications.length,
    plural: applications.length !== 1 ? "s" : "",
  });

  return (
    <div className="gjm-page px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to Dashboard")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Briefcase className="w-7 h-7 text-[var(--brand-primary)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("Applications.title", "My Applications")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">{countLabel}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        {applications.length === 0 && !error ? (
          <div className="glass rounded-2xl p-12 text-center border border-[var(--border)]">
            <Briefcase className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)] mb-4">
              {t("Applications.empty", "No applications yet")}
            </p>
            <Link
              href="/jobs"
              className="inline-flex px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--text-on-brand)] text-sm font-semibold"
            >
              {t("Applications.browseJobs", "Browse Jobs")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = getStatusConfig(app.status);
              const salary = formatSalary(
                app.job?.currency,
                app.job?.salaryMin,
                app.job?.salaryMax,
              );
              const appliedDate = new Date(app.createdAt).toLocaleDateString(
                locale,
              );
              const appliedTemplate = t(
                "Applications.appliedOn",
                "Applied {date}",
              );
              const appliedText = interpolate(appliedTemplate, {
                date: appliedDate,
              });

              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 border border-[var(--border)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      {app.job ? (
                        <Link
                          href={`/jobs/${app.job.id}`}
                          className="text-[var(--text-primary)] font-semibold hover:text-[var(--brand-primary)] transition-colors"
                        >
                          {app.job.title}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-primary)] font-semibold">
                          {t(
                            "Applications.jobUnavailable",
                            "Job unavailable",
                          )}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
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
                      <p className="text-[var(--text-subtle)] text-xs mt-2">
                        {appliedText}
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
    </div>
  );
}
