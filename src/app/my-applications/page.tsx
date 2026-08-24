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
  Loader2,
  ArrowLeft,
  MapPin,
  Building2,
  DollarSign,
  Search,
  Calendar,
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
    remote: boolean;
    type: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    company: {
      id: string;
      name: string;
      logo: string | null;
      location: string | null;
    };
    category: {
      id: string;
      name: string;
      color: string;
    } | null;
  };
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  applied: {
    label: "Applied",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  viewed: {
    label: "Viewed",
    icon: <Eye className="w-4 h-4" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  interview: {
    label: "Interview",
    icon: <Users className="w-4 h-4" />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  hired: {
    label: "Hired",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
        } else {
          setError(data.error || "Failed to load applications");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load applications");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading applications...</p>
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
            href="/jobs"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              My Applications
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            {applications.length} application
            {applications.length !== 1 ? "s" : ""} submitted
          </p>
        </div>

        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.applied;
              return (
                <div
                  key={app.id}
                  className="glass rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-cyan-400 font-bold text-sm">
                          {getLogo(app.job.company.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-base mb-1">
                          {app.job.title}
                        </h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mb-2">
                          <Building2 className="w-3.5 h-3.5" />
                          {app.job.company.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {app.job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {app.job.currency} {(app.job.salaryMin ?? 0).toLocaleString()} - {(app.job.salaryMax ?? 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Applied {timeAgo(app.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {app.coverLetter && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-slate-500 text-xs mb-1">Your cover letter:</p>
                      <p className="text-slate-300 text-sm line-clamp-2">
                        {app.coverLetter}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={`/jobs/${app.job.id}`}
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                    >
                      View Job →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">
              No applications yet
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Start applying to jobs and track your progress here
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <Search className="w-4 h-4" />
              Browse Jobs
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
