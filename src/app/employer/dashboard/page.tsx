"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Eye,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Trash2,
  Ban,
} from "lucide-react";
import {
  PlanLimitBanner,
  getPlanLimitFromResponse,
} from "@/components/plan-limit-banner";
import { useLocale } from "@/components/locale-provider";

interface Job {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  applicantCount?: number;
  applicationCount?: number;
  createdAt: string;
  company: { name: string };
}

interface Application {
  id: string;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
  job: { title: string };
}

interface PlanInfo {
  name: string;
  maxActiveJobsEmployer: number;
  activeJobs: number;
  remaining: number;
  atLimit: boolean;
}

function jobApplicantCount(job: Job): number {
  return job.applicationCount ?? job.applicantCount ?? 0;
}

export default function EmployerDashboardPage() {
  const { t, locale } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    applicants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/employer/jobs"),
        fetch("/api/employer/applications"),
      ]);

      const jobsData = await jobsRes.json().catch(() => ({}));
      const appsData = await appsRes.json().catch(() => ({}));

      if (!jobsRes.ok && jobsRes.status === 403) {
        const limit = getPlanLimitFromResponse(jobsData);
        if (limit) setPlanLimit(limit);
      }

      const jobList: Job[] = jobsData.jobs || [];
      setJobs(jobList);
      if (jobsData.plan) setPlan(jobsData.plan);

      setApplications(appsData.applications?.slice(0, 5) || []);
      setStats({
        total: jobList.length,
        active: jobList.filter((j) => j.status === "active").length,
        pending: jobList.filter((j) => j.status === "pending").length,
        applicants: jobList.reduce(
          (sum, j) => sum + jobApplicantCount(j),
          0
        ),
      });
      setError("");
    } catch {
      setError(t("Common.error", "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function closeJob(jobId: string) {
    setActionId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || t("Common.error", "Failed to close job"));
        return;
      }
      await loadDashboard();
    } catch {
      alert(t("Common.errorNetwork", "Network error"));
    } finally {
      setActionId(null);
    }
  }

  async function deleteJob(jobId: string) {
    if (
      !confirm(
        t(
          "Common.delete",
          "Permanently delete this job? This cannot be undone."
        )
      )
    ) {
      return;
    }
    setActionId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || t("Common.error", "Failed to delete job"));
        return;
      }
      await loadDashboard();
    } catch {
      alert(t("Common.errorNetwork", "Network error"));
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="gjm-page">
        <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: t("Employer.myJobs", "Total Jobs"),
      value: stats.total,
      icon: <Briefcase className="w-5 h-5 text-[var(--brand-primary)]" />,
      color: "bg-[image:var(--gradient-brand)]",
    },
    {
      label: t("Common.success", "Active"),
      value: stats.active,
      icon: <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />,
      color: "from-[var(--success)] to-[var(--success-hover)]",
    },
    {
      label: t("Common.loading", "Pending"),
      value: stats.pending,
      icon: <Clock className="w-5 h-5 text-[var(--warning)]" />,
      color: "from-[var(--warning)] to-[var(--warning-hover)]",
    },
    {
      label: t("Employer.applicants", "Applicants"),
      value: stats.applicants,
      icon: <Users className="w-5 h-5 text-[var(--brand-accent)]" />,
      color: "from-[var(--brand-accent)] to-[var(--brand-accent-hover)]",
    },
  ];

  return (
    <div className="gjm-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("Employer.title", "Employer Dashboard")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Employer.myJobs", "Manage your jobs and applicants")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/employer/interviews"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] transition-all text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              {t("Nav.dashboard", "Interviews")}
            </Link>
            <Link
              href="/employer/post-job"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                plan?.atLimit
                  ? "bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed pointer-events-none"
                  : "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)]"
              }`}
            >
              <Plus className="w-4 h-4" />
              {t("Employer.postJob", "Post New Job")}
            </Link>
          </div>
        </div>

        {planLimit && (
          <div className="mb-6">
            <PlanLimitBanner
              message={planLimit.message}
              code={planLimit.code}
              onClose={() => setPlanLimit(null)}
            />
          </div>
        )}

        {plan && (
          <div className="mb-6 glass rounded-xl p-4 border border-[var(--border)] text-sm text-[var(--text-body)] flex flex-wrap gap-4">
            <span>
              {t("PlanUsage.activeEmployerJobsLabel", "Active job posts")}:{" "}
              <strong className="text-[var(--text-primary)]">
                {plan.activeJobs}
                {plan.maxActiveJobsEmployer >= 0
                  ? ` / ${plan.maxActiveJobsEmployer}`
                  : ""}
              </strong>
            </span>
            <span className="text-[var(--text-muted)]">·</span>
            <span>
              {t("Pricing.title", "Plan")}:{" "}
              <strong className="text-[var(--text-primary)]">{plan.name}</strong>
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 text-[var(--error)] text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="glass rounded-2xl p-5 border border-[var(--border)]"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center mb-3`}
              >
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              <p className="text-[var(--text-muted)] text-sm">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[var(--brand-primary)]" />
                  {t("Employer.myJobs", "Posted Jobs")}
                </h2>
                {!plan?.atLimit && (
                  <Link
                    href="/employer/post-job"
                    className="text-[var(--brand-accent)] text-sm hover:text-[var(--brand-accent)] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {t("Common.submit", "New")}
                  </Link>
                )}
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-3" />
                  <p className="text-[var(--text-muted)] text-sm">
                    {t("Jobs.noJobsFound", "No jobs posted yet")}
                  </p>
                  <Link
                    href="/employer/post-job"
                    className="inline-flex items-center gap-2 mt-3 text-[var(--brand-accent)] text-sm hover:text-[var(--brand-accent)] transition-colors"
                  >
                    {t("Employer.postJob", "Post your first job")}{" "}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-[var(--border)] transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-[var(--text-primary)] text-sm">
                            {job.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              job.status === "active"
                                ? "bg-[var(--success-soft)] text-[var(--success)]"
                                : job.status === "pending"
                                  ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-[var(--text-muted)] text-xs mt-1">
                          {job.company?.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {job.viewCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{" "}
                          {jobApplicantCount(job)}
                        </span>
                        <Link
                          href="/employer/applications"
                          className="px-3 py-1.5 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] text-xs font-medium hover:bg-[var(--brand-accent-soft)] transition-all"
                        >
                          {t("Employer.applicants", "Applicants")}
                        </Link>
                        {job.status === "active" && (
                          <button
                            type="button"
                            disabled={actionId === job.id}
                            onClick={() => closeJob(job.id)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] text-xs font-medium hover:bg-[var(--warning-soft)] transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            {actionId === job.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            {t("Common.cancel", "Close")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionId === job.id}
                          onClick={() => deleteJob(job.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--error-soft)] text-[var(--error)] text-xs font-medium hover:bg-[var(--error-soft)] transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          {actionId === job.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {t("Common.delete", "Delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--success)]" />
                {t("Employer.applicants", "Recent applicants")}
              </h2>
              {applications.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm text-center py-6">
                  {t("Common.noResults", "No applications yet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                          {app.user?.name || app.user?.email}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {app.job?.title}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                          app.status === "accepted" ||
                          app.status === "hired"
                            ? "bg-[var(--success-soft)] text-[var(--success)]"
                            : app.status === "rejected"
                              ? "bg-[var(--error-soft)] text-[var(--error)]"
                              : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/employer/applications"
                className="mt-4 flex items-center justify-center gap-2 text-[var(--brand-accent)] text-sm hover:text-[var(--brand-accent)] transition-colors"
              >
                {t("Common.view", "View All")}{" "}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-[var(--border)] h-fit">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              {t("Dashboard.menu", "Quick Actions")}
            </h2>
            <div className="space-y-2">
              <Link
                href="/employer/company/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all text-sm text-[var(--text-body)]"
              >
                <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
                {t("Employer.company", "Add Company")}
              </Link>
              <Link
                href="/employer/post-job"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all text-sm text-[var(--text-body)]"
              >
                <Briefcase className="w-4 h-4 text-[var(--brand-accent)]" />
                {t("Employer.postJob", "Post Job")}
              </Link>
              <Link
                href="/employer/applications"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all text-sm text-[var(--text-body)]"
              >
                <Users className="w-4 h-4 text-[var(--success)]" />
                {t("Employer.applicants", "Review Applicants")}
              </Link>
              <Link
                href="/employer/interviews"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all text-sm text-[var(--text-body)]"
              >
                <MessageSquare className="w-4 h-4 text-[var(--warning)]" />
                {t("Nav.dashboard", "Schedule Interviews")}
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all text-sm text-[var(--text-body)]"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--warning)]" />
                {t("Common.upgrade", "Upgrade plan")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
