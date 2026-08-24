"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Briefcase,
  Building2,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalJobs: number;
  totalCompanies: number;
  totalApplications: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface RecentJob {
  id: string;
  title: string;
  company: { name: string };
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d ago`;
  return "Today";
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data.stats);
          setRecentUsers(data.recentUsers);
          setRecentJobs(data.recentJobs);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load admin data");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-2">{error}</p>
          <Link href="/" className="text-cyan-400 text-sm hover:underline">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers || 0, icon: <Users className="w-5 h-5 text-cyan-400" /> },
    { title: "Total Jobs", value: stats?.totalJobs || 0, icon: <Briefcase className="w-5 h-5 text-purple-400" /> },
    { title: "Companies", value: stats?.totalCompanies || 0, icon: <Building2 className="w-5 h-5 text-emerald-400" /> },
    { title: "Applications", value: stats?.totalApplications || 0, icon: <CheckCircle2 className="w-5 h-5 text-amber-400" /> },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-400" />
            Admin Panel
          </h1>
          <p className="text-slate-400 text-sm">Manage your platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.title} className="glass rounded-2xl p-5">
              <div className="p-2.5 rounded-xl bg-white/5 w-fit mb-4">{stat.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-slate-400 text-sm">{stat.title}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Recent Users
              </h2>
              <Link href="/admin/users" className="text-cyan-400 text-xs hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {(user.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{user.name || "Unknown"}</p>
                      <p className="text-slate-500 text-xs">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      user.role === "owner" ? "bg-amber-500/10 text-amber-400" :
                      user.role === "admin" ? "bg-purple-500/10 text-purple-400" :
                      "bg-white/5 text-slate-400"
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-[10px] text-slate-500">{timeAgo(user.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                Recent Jobs
              </h2>
              <Link href="/admin/jobs" className="text-cyan-400 text-xs hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentJobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                  <div>
                    <p className="text-white text-sm font-medium">{job.title}</p>
                    <p className="text-slate-500 text-xs">{job.company.name}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{timeAgo(job.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
