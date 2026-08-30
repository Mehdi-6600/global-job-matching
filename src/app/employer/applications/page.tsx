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

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-400 bg-amber-500/10",
    icon: <Clock className="w-4 h-4" />,
  },
  applied: {
    label: "Pending",
    color: "text-amber-400 bg-amber-500/10",
    icon: <Clock className="w-4 h-4" />,
  },
  viewed: {
    label: "Viewed",
    color: "text-blue-400 bg-blue-500/10",
    icon: <Eye className="w-4 h-4" />,
  },
  interview: {
    label: "Interview",
    color: "text-cyan-400 bg-cyan-500/10",
    icon: <Users className="w-4 h-4" />,
  },
  hired: {
    label: "Hired",
    color: "text-emerald-400 bg-emerald-500/10",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400 bg-red-500/10",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "viewed", label: "Viewed" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
] as const;

export default function EmployerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

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
    const res = await fetch(`/api/employer/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const nextStatus = data?.application?.status || status;
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
      );
    }
    setUpdating(null);
  }

  const filtered = applications.filter((a) => {
    if (filter !== "all") {
      if (filter === "pending") {
        if (a.status !== "pending" && a.status !== "applied") return false;
      } else if (a.status !== filter) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        a.user.name?.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.job.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
        <div className="glass rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Applications</h1>
                <p className="text-slate-400 text-sm">
                  {applications.length} total
                </p>
              </div>
            </div>
            <Link
              href="/employer/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 mb-6 border border-white/10 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="viewed">Viewed</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-white/10">
              <Briefcase className="w-14 h-14 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">
                No applications found
              </h3>
              <p className="text-slate-400 text-sm">
                {applications.length === 0
                  ? "When candidates apply, they appear here."
                  : "Adjust your filters."}
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
                  className="glass rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-lg shrink-0">
                        {app.user.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {app.user.name || "Anonymous"}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {app.user.email}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          Applied for{" "}
                          <Link
                            href={`/jobs/${app.job.id}`}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            {app.job.title}
                          </Link>{" "}
                          at {app.job.company.name}
                        </p>
                        {app.user.title && (
                          <p className="text-slate-500 text-xs mt-0.5">
                            {app.user.title}
                            {app.user.location && ` • ${app.user.location}`}
                          </p>
                        )}
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
                          className="appearance-none px-4 py-1.5 pr-8 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                        {updating === app.id && (
                          <Loader2 className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                  {app.coverLetter && (
                    <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Cover Letter
                      </p>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
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
