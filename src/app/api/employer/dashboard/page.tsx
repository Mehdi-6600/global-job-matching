"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  PlusSquare,
  Users,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  MapPin,
  DollarSign,
  Globe,
  BarChart3,
  Settings,
  AlertCircle,
} from "lucide-react";

interface EmployerJob {
  id: string;
  title: string;
  location: string;
  remote: boolean;
  type: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  viewCount: number;
  applicantCount: number;
  createdAt: string;
  company: { id: string; name: string };
  category: { id: string; name: string; color: string } | null;
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  pending: {
    label: "Pending Review",
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  active: {
    label: "Active",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  closed: {
    label: "Closed",
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
  },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/employer/jobs/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) {
          setJobs(data.jobs);
        } else {
          setError(data.error || "Failed to load jobs");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard");
        setLoading(false);
      });
  }, []);

  const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicantCount, 0);
  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const pendingJobs = jobs.filter((j) => j.status === "pending").length;

  const stats = [
    {
      title: "Total Jobs",
      value: jobs.length.toString(),
      icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: "Active",
      value: activeJobs.toString(),
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "Pending",
      value: pendingJobs.toString(),
      icon: <Clock className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Total Applicants",
      value: totalApplicants.toString(),
      icon: <Users className="w-5 h-5 text-purple-400" />,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            Back to Main Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Employer Dashboard
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Manage your job postings and applicants
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/5">{stat.icon}</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-slate-400 text-sm">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/employer/post-job"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98]"
          >
            <PlusSquare className="w-4 h-4" />
            Post New Job
          </Link>
          <Link
            href="/companies"
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 px-6 py-3 rounded-xl text-sm font-medium transition-all"
          >
            <Globe className="w-4 h-4" />
            View Public Page
          </Link>
        </div>

        {/* Jobs List */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Your Job Postings
            </h2>
            <span className="text-slate-400 text-sm">{jobs.length} total</span>
          </div>

          {jobs.length > 0 ? (
            <div className="divide-y divide-white/5">
              {jobs.map((job) => {
                const status = statusConfig[job.status] || statusConfig.pending;
                return (
                  <div
                    key={job.id}
                    className="p-5 sm:p-6 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm sm:text-base">
                            {job.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.bg} ${status.color}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {job.currency}{" "}
                            {(job.salaryMin ?? 0).toLocaleString()} -{" "}
                            {(job.salaryMax ?? 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {job.viewCount} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {job.applicantCount} applicants
                          </span>
                          <span>{timeAgo(job.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium mb-1">No jobs posted yet</p>
              <p className="text-slate-500 text-sm mb-6">
                Start by posting your first job
              </p>
              <Link
                href="/employer/post-job"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <PlusSquare className="w-4 h-4" />
                Post a Job
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
