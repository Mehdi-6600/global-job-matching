"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  ChevronDown,
  Search,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Application {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    title: string | null;
    location: string | null;
  };
  job: {
    id: string;
    title: string;
    company: { name: string };
  };
}

export default function EmployerApplicationsPage() {
  const { t, locale } = useLocale();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    pending: {
      label: t("Applications.statusPending", "Pending"),
      color: "text-[var(--warning)] bg-[var(--warning-soft)]",
      icon: <Clock className="w-4 h-4" />,
    },
    applied: {
      label: t("Applications.statusPending", "Pending"),
      color: "text-[var(--warning)] bg-[var(--warning-soft)]",
      icon: <Clock className="w-4 h-4" />,
    },
    viewed: {
      label: t("Applications.statusViewed", "Viewed"),
      color: "text-[var(--info)] bg-[var(--info-soft)]",
      icon: <Eye className="w-4 h-4" />,
    },
    interview: {
      label: t("Applications.statusInterview", "Interview"),
      color: "text-[var(--brand-primary)] bg-[var(--brand-primary-soft)]",
      icon: <Users className="w-4 h-4" />,
    },
    hired: {
      label: t("Applications.statusHired", "Hired"),
      color: "text-[var(--success)] bg-[var(--success-soft)]",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    rejected: {
      label: t("Applications.statusRejected", "Rejected"),
      color: "text-[var(--error)] bg-[var(--error-soft)]",
      icon: <XCircle className="w-4 h-4" />,
    },
  };

  const STATUS_OPTIONS = [
    { value: "pending", label: t("Applications.statusPending", "Pending") },
    { value: "viewed", label: t("Applications.statusViewed", "Viewed") },
    { value: "interview", label: t("Applications.statusInterview", "Interview") },
    { value: "hired", label: t("Applications.statusHired", "Hired") },
    { value: "rejected", label: t("Applications.statusRejected", "Rejected") },
  ] as const;

  useEffect(() => {
    fetch("/api/employer/applications")
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/employer/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  const filtered = applications.filter((app) => {
    if (filter !== "all" && app.status !== filter) {
      if (!(filter === "pending" && app.status === "applied")) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const hay = `${app.user.name || ""} ${app.user.email} ${app.job.title}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="gjm-page">
        <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="gjm-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/employer/dashboard"
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Common.back", "Back")}
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--success)]" />
              {t("Employer.applicants", "Applicants")}
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Common.search", "Search...")}
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder-[var(--text-subtle)] outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none"
          >
            <option value="all">{t("Jobs.allTypes", "All")}</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-[var(--border)]">
              <Briefcase className="w-10 h-10 text-[var(--text-subtle)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)]">
                {t("Common.noResults", "No applications found")}
              </p>
            </div>
          ) : (
            filtered.map((app) => {
              const st =
                statusConfig[app.status] || statusConfig.pending;
              const selectValue =
                app.status === "applied" ? "pending" : app.status;

              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 border border-[var(--border)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand-accent-soft)] flex items-center justify-center text-[var(--brand-accent)] font-semibold text-sm shrink-0">
                        {(app.user.name || app.user.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--text-primary)] font-medium truncate">
                          {app.user.name || app.user.email}
                        </p>
                        <p className="text-[var(--text-muted)] text-sm truncate">
                          {app.job.title}
                        </p>
                        {app.user.title && (
                          <p className="text-[var(--text-muted)] text-xs mt-0.5">
                            {app.user.title}
                            {app.user.location && ` • ${app.user.location}`}
                          </p>
                        )}
                        <p className="text-[var(--text-subtle)] text-xs mt-1">
                          {new Date(app.createdAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${st.color}`}
                      >
                        {st.icon} {st.label}
                      </span>
                      <div className="relative">
                        <select
                          value={selectValue}
                          onChange={(e) =>
                            updateStatus(app.id, e.target.value)
                          }
                          disabled={updating === app.id}
                          className="appearance-none px-4 py-1.5 pe-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none" />
                        {updating === app.id && (
                          <Loader2 className="absolute -end-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-accent)] animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                  {app.coverLetter && (
                    <div className="mt-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border-soft)]">
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Cover Letter
                      </p>
                      <p className="text-[var(--text-body)] text-sm leading-relaxed whitespace-pre-wrap">
                        {app.coverLetter}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
