"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Shield,
  ArrowLeft,
  Search,
  Eye,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  totalApplications: number;
  pendingCompanies: number;
  pendingJobs: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { applications: number };
}

interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  status: string;
  createdAt: string;
  owner: { id: string; name: string | null; email: string };
  _count: { jobs: number };
}

const tabs = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "companies", label: "Companies", icon: <Building2 className="w-4 h-4" /> },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch(console.error);

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(console.error);

    fetch("/api/admin/companies")
      .then((r) => r.json())
      .then((data) => {
        if (data.companies) setCompanies(data.companies);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCompanyStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-slate-400 text-sm">Manage platform data</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Total Users", value: stats.totalUsers, icon: <Users className="w-5 h-5 text-cyan-400" /> },
              { label: "Companies", value: stats.totalCompanies, icon: <Building2 className="w-5 h-5 text-purple-400" /> },
              { label: "Jobs", value: stats.totalJobs, icon: <Briefcase className="w-5 h-5 text-emerald-400" /> },
              { label: "Applications", value: stats.totalApplications, icon: <CheckCircle2 className="w-5 h-5 text-blue-400" /> },
              { label: "Pending Companies", value: stats.pendingCompanies, icon: <Clock className="w-5 h-5 text-amber-400" /> },
              { label: "Pending Jobs", value: stats.pendingJobs, icon: <Clock className="w-5 h-5 text-amber-400" /> },
            ].map((s) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-5 border border-white/10"
              >
                <div className="p-2 rounded-xl bg-white/5 w-fit mb-3">{s.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-1">{s.value}</h3>
                <p className="text-slate-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-semibold">Users</h2>
              <span className="text-slate-400 text-sm">{users.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th className="px-4 py-3 text-slate-400 font-medium">Name</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Email</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Role</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Applications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u._count.applications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-semibold">Companies</h2>
              <span className="text-slate-400 text-sm">{companies.length} total</span>
            </div>
            <div className="divide-y divide-white/5">
              {companies.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 hover:bg-white/[0.02]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">{c.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            c.status === "verified"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : c.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {c.owner.name || c.owner.email} • {c._count.jobs} jobs • {c.location || "No location"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleCompanyStatus(c.id, "verified")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleCompanyStatus(c.id, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <Link
                        href={`/companies/${c.id}`}
                        className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
