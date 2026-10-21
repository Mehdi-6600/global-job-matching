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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: t("Employer.myJobs", "Total Jobs"),
      value: stats.total,
      icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: t("Common.success", "Active"),
      value: stats.active,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: t("Common.loading", "Pending"),
      value: stats.pending,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: t("Employer.applicants", "Applicants"),
      value: stats.applicants,
      icon: <Users className="w-5 h-5 text-indigo-400" />,
      color: "from-indigo-500 to-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t("Employer.title", "Employer Dashboard")}
            </h1>
            <p className="text-slate-400 text-sm">
              {t("Employer.myJobs", "Manage your jobs and applicants")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/employer/interviews"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              {t("Nav.dashboard", "Interviews")}
            </Link>
            <Link
              href="/employer/post-job"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                plan?.atLimit
                  ? "bg-white/10 text-slate-400 cursor-not-allowed pointer-events-none"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
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
          <div className="mb-6 glass rounded-xl p-4 border border-white/10 text-sm text-slate-300 flex flex-wrap gap-4">
            <span>
              {t("PlanUsage.activeEmployerJobsLabel", "Active job posts")}:{" "}
              <strong className="text-white">
                {plan.activeJobs}
                {plan.maxActiveJobsEmployer >= 0
                  ? ` / ${plan.maxActiveJobsEmployer}`
                  : ""}
              </strong>
            </span>
            <span className="text-slate-500">·</span>
            <span>
              {t("Pricing.title", "Plan")}:{" "}
              <strong className="text-white">{plan.name}</strong>
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="glass rounded-2xl p-5 border border-white/10"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center mb-3`}
              >
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-slate-400 text-sm">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-400" />
                  {t("Employer.myJobs", "Posted Jobs")}
                </h2>
                {!plan?.atLimit && (
                  <Link
                    href="/employer/post-job"
                    className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {t("Common.submit", "New")}
                  </Link>
                )}
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    {t("Jobs.noJobsFound", "No jobs posted yet")}
                  </p>
                  <Link
                    href="/employer/post-job"
                    className="inline-flex items-center gap-2 mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-white text-sm">
                            {job.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              job.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : job.status === "pending"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          {job.company?.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {job.viewCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{" "}
                          {jobApplicantCount(job)}
                        </span>
                        <Link
                          href="/employer/applications"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition-all"
                        >
                          {t("Employer.applicants", "Applicants")}
                        </Link>
                        {job.status === "active" && (
                          <button
                            type="button"
                            disabled={actionId === job.id}
                            onClick={() => closeJob(job.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
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
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
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

            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {t("Employer.applicants", "Recent applicants")}
              </h2>
              {applications.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  {t("Common.noResults", "No applications yet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {app.user?.name || app.user?.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {app.job?.title}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                          app.status === "accepted" ||
                          app.status === "hired"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : app.status === "rejected"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-slate-500/10 text-slate-400"
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
                className="mt-4 flex items-center justify-center gap-2 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
              >
                {t("Common.view", "View All")}{" "}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10 h-fit">
            <h2 className="text-lg font-semibold text-white mb-3">
              {t("Dashboard.menu", "Quick Actions")}
            </h2>
            <div className="space-y-2">
              <Link
                href="/employer/company/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                {t("Employer.company", "Add Company")}
              </Link>
              <Link
                href="/employer/post-job"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" />
                {t("Employer.postJob", "Post Job")}
              </Link>
              <Link
                href="/employer/applications"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                {t("Employer.applicants", "Review Applicants")}
              </Link>
              <Link
                href="/employer/interviews"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                {t("Nav.dashboard", "Schedule Interviews")}
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                {t("Common.upgrade", "Upgrade plan")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
