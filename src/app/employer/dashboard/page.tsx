"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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

function jobApplicantCount(job: Job): number {
  return job.applicationCount ?? job.applicantCount ?? 0;
}

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    applicants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/employer/jobs/list").then((r) => r.json()),
      fetch("/api/employer/applications").then((r) => r.json()),
    ])
      .then(([jobsData, appsData]) => {
        const jobList: Job[] = jobsData.jobs || [];
        setJobs(jobList);
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
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Employer Dashboard</h1>
            <p className="text-slate-400 text-sm">
              Manage your jobs and applicants
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/employer/interviews"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" /> Interviews
            </Link>
            <Link
              href="/employer/post-job"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" /> Post New Job
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Jobs",
              value: stats.total,
              icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
              color: "from-cyan-500 to-blue-500",
            },
            {
              label: "Active",
              value: stats.active,
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
              color: "from-emerald-500 to-teal-500",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: <Clock className="w-5 h-5 text-amber-400" />,
              color: "from-amber-500 to-orange-500",
            },
            {
              label: "Applicants",
              value: stats.applicants,
              icon: <Users className="w-5 h-5 text-indigo-400" />,
              color: "from-indigo-500 to-purple-500",
            },
          ].map((card) => (
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
                  <Briefcase className="w-5 h-5 text-cyan-400" /> Posted Jobs
                </h2>
                <Link
                  href="/employer/post-job"
                  className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> New
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No jobs posted yet</p>
                  <Link
                    href="/employer/post-job"
                    className="inline-flex items-center gap-2 mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
                  >
                    Post your first job <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-4 text-xs text-slate-400">
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
                          View Applicants
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Recent Applicants
              </h2>
              {applications.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No applications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-300 text-xs font-bold">
                        {(app.user.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {app.user.name || "Anonymous"}
                        </p>
                        <p className="text-slate-500 text-xs truncate">
                          {app.job.title}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            app.status === "pending" ||
                            app.status === "applied"
                              ? "bg-amber-500/10 text-amber-400"
                              : app.status === "hired"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/employer/applications"
                className="mt-4 flex items-center justify-center gap-2 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-3">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link
                  href="/employer/company/new"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
                >
                  <Plus className="w-4 h-4 text-cyan-400" /> Add Company
                </Link>
                <Link
                  href="/employer/post-job"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
                >
                  <Briefcase className="w-4 h-4 text-indigo-400" /> Post Job
                </Link>
                <Link
                  href="/employer/applications"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
                >
                  <Users className="w-4 h-4 text-emerald-400" /> Review
                  Applicants
                </Link>
                <Link
                  href="/employer/interviews"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-slate-300"
                >
                  <MessageSquare className="w-4 h-4 text-amber-400" /> Schedule
                  Interviews
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
