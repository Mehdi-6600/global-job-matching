"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Users,
  Eye,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface EmployerJob {
  id: string;
  title: string;
  location: string;
  type: string;
  status: string;
  viewCount: number;
  createdAt: string;
  company: {
    id: string;
    name: string;
  };
  _count: {
    applications: number;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "Today";
}

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jobs/employer")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) {
          setJobs(data.jobs);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your jobs");
        setLoading(false);
      });
  }, []);

  const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);
  const totalApps = jobs.reduce((sum, j) => sum + j._count.applications, 0);
  const activeJobs = jobs.filter((j) => j.status === "active").length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading employer dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Employer Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage your job listings and applicants</p>
          </div>
          <Link
            href="/post-job"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </Link>
        </div>

        {error && (
          <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { title: "Total Jobs", value: jobs.length.toString(), icon: <Briefcase className="w-5 h-5 text-cyan-400" /> },
            { title: "Active Jobs", value: activeJobs.toString(), icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" /> },
            { title: "Total Views", value: totalViews.toString(), icon: <Eye className="w-5 h-5 text-blue-400" /> },
            { title: "Applications", value: totalApps.toString(), icon: <Users className="w-5 h-5 text-purple-400" /> },
          ].map((stat) => (
            <div key={stat.title} className="glass rounded-2xl p-5">
              <div className="p-2.5 rounded-xl bg-white/5 w-fit mb-4">{stat.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-slate-400 text-sm">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Jobs List */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Your Job Listings
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">No jobs posted yet</p>
              <p className="text-slate-400 text-sm mb-6">Start hiring by posting your first job.</p>
              <Link
                href="/post-job"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Post a Job
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 font-bold text-sm">
                        {job.company.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm mb-0.5">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>{job.location}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">{job.type}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            job.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {job.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {job._count.applications} applicants
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(job.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/jobs/${job.id}/applicants`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {job._count.applications}
                    </Link>
                    <button
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 transition-all"
                      title="Edit"
                      onClick={() => alert("Edit coming soon!")}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                      title="Delete"
                      onClick={() => {
                        if (confirm("Delete this job?")) {
                          alert("Delete coming soon!");
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
