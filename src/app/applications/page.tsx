"use client";

import { useState } from "react";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";

type Status = "pending" | "reviewing" | "accepted" | "rejected";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  status: Status;
  jobId: string;
}

const statusConfig: Record<Status, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: Clock,
  },
  reviewing: {
    label: "Reviewing",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    icon: Eye,
  },
  accepted: {
    label: "Accepted",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
};

const initialApps: Application[] = [
  {
    id: "app-1",
    jobTitle: "Senior Frontend Developer",
    company: "TechCorp Global",
    location: "San Francisco, CA",
    appliedAt: "2 days ago",
    status: "reviewing",
    jobId: "1",
  },
  {
    id: "app-2",
    jobTitle: "Backend Engineer",
    company: "DataFlow Systems",
    location: "New York, NY",
    appliedAt: "5 days ago",
    status: "pending",
    jobId: "2",
  },
  {
    id: "app-3",
    jobTitle: "Product Designer",
    company: "Creative Studio",
    location: "London, UK",
    appliedAt: "1 week ago",
    status: "accepted",
    jobId: "3",
  },
  {
    id: "app-4",
    jobTitle: "DevOps Engineer",
    company: "CloudScale Inc",
    location: "Austin, TX",
    appliedAt: "2 weeks ago",
    status: "rejected",
    jobId: "5",
  },
];

const filters: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
];

export default function MyApplicationsPage() {
  const [applications] = useState<Application[]>(initialApps);
  const [filter, setFilter] = useState<Status | "all">("all");

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    reviewing: applications.filter((a) => a.status === "reviewing").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Applications</h1>
          <p className="text-slate-400 text-sm">Track the status of your job applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total", value: counts.all, color: "text-white" },
            { label: "Pending", value: counts.pending, color: "text-amber-400" },
            { label: "Reviewing", value: counts.reviewing, color: "text-cyan-400" },
            { label: "Accepted", value: counts.accepted, color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.value
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1.5 text-xs opacity-70">({counts[f.value]})</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {filtered.map((app) => {
            const config = statusConfig[app.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={app.id}
                className="glass rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <Link href={`/jobs/${app.jobId}`}>
                      <h3 className="text-lg font-bold text-white hover:text-cyan-400 transition-colors">
                        {app.jobTitle}
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {app.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {app.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Applied {app.appliedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${config.bg} ${config.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </span>
                  <Link
                    href={`/jobs/${app.jobId}`}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No applications found.</p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              Browse jobs to apply
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
