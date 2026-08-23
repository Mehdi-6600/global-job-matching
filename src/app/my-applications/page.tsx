"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Eye,
  MapPin,
  Building2,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Application {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    company: {
      id: string;
      name: string;
      logo: string | null;
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  applied: {
    label: "Applied",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  viewed: {
    label: "Viewed",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  interview: {
    label: "Interview",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: <Users className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  hired: {
    label: "Hired",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "Today";
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          setApplications(data.applications);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load applications");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your applications...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">My Applications</h1>
          <p className="text-slate-400 text-sm">
            {applications.length} job{applications.length !== 1 ? "s" : ""} applied
          </p>
        </div>

        {error && (
          <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {applications.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">No applications yet</p>
            <p className="text-slate-400 text-sm mb-6">
              Start applying to jobs and track your progress here.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              Browse Jobs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.applied;
              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 md:p-6 border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-cyan-400 font-bold text-sm">
                          {app.job.company.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-base mb-0.5">
                          {app.job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {app.job.company.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.job.location}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                            {app.job.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                      <Link
                        href={`/jobs/${app.job.id}`}
                        className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Applied {timeAgo(app.createdAt)}
                    </span>
                    {app.coverLetter && (
                      <span className="text-xs text-cyan-400">Cover letter included</span>
                    )}
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
