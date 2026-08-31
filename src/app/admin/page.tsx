"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  Mail,
  CreditCard,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  totalApplications: number;
  pendingCompanies: number;
  pendingJobs: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan?: string | null;
  createdAt: string;
}

interface CompanyItem {
  id: string;
  name: string;
  slug?: string;
  status: string;
  owner: { name: string | null; email: string } | null;
}

interface JobItem {
  id: string;
  title: string;
  status: string;
  company?: { name: string } | null;
}

interface TxItem {
  id: string;
  planId: string;
  amount: number;
  status: string;
  cryptoType: string | null;
  txHash: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string | null;
  };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "companies" | "jobs" | "payments"
  >("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchCompanies(),
      fetchJobs(),
      fetchTransactions(),
    ]).finally(() => setLoading(false));
  }, []);

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.status === 403) {
      setError("Forbidden — not admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats || data);
    }
  }

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  async function fetchCompanies() {
    const res = await fetch("/api/admin/companies");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies || []);
    }
  }

  async function fetchJobs() {
    const res = await fetch("/api/admin/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs || []);
    }
  }

  async function fetchTransactions() {
    const res = await fetch("/api/admin/transactions");
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions || []);
    }
  }

  async function updateCompanyStatus(id: string, status: string) {
    setActionLoading(id);
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
    setActionLoading(null);
  }

  async function updateJobStatus(id: string, status: string) {
    setActionLoading(id);
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status } : j))
      );
    }
    setActionLoading(null);
  }

  async function updatePayment(id: string, status: "confirmed" | "rejected") {
    setActionLoading(id);
    const res = await fetch("/api/admin/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await fetchTransactions();
      await fetchUsers();
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "users" as const,
      label: "Users",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "companies" as const,
      label: "Companies",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: "jobs" as const,
      label: "Jobs",
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: "payments" as const,
      label: "Payments",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm">Manage platform settings</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/analytics"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
            <Link
              href="/admin/newsletter"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <Mail className="w-4 h-4" /> Newsletter
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: "Total Users",
                value: stats.totalUsers,
                icon: <Users className="w-5 h-5 text-indigo-400" />,
                color: "from-indigo-500 to-purple-500",
              },
              {
                label: "Total Companies",
                value: stats.totalCompanies,
                icon: <Building2 className="w-5 h-5 text-cyan-400" />,
                color: "from-cyan-500 to-blue-500",
              },
              {
                label: "Total Jobs",
                value: stats.totalJobs,
                icon: <Briefcase className="w-5 h-5 text-emerald-400" />,
                color: "from-emerald-500 to-teal-500",
              },
              {
                label: "Total Applications",
                value: stats.totalApplications,
                icon: <CheckCircle2 className="w-5 h-5 text-amber-400" />,
                color: "from-amber-500 to-orange-500",
              },
              {
                label: "Pending Companies",
                value: stats.pendingCompanies,
                icon: <Building2 className="w-5 h-5 text-pink-400" />,
                color: "from-pink-500 to-rose-500",
              },
              {
                label: "Pending Jobs",
                value: stats.pendingJobs,
                icon: <Briefcase className="w-5 h-5 text-violet-400" />,
                color: "from-violet-500 to-purple-500",
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
        )}

        {activeTab === "users" && (
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Plan</th>
                    <th className="p-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 text-white">{user.name || "—"}</td>
                      <td className="p-4 text-slate-400">{user.email}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {user.plan || "free"}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "companies" && (
          <div className="space-y-3">
            {companies.length === 0 && (
              <p className="text-slate-500 text-sm">No companies</p>
            )}
            {companies.map((company) => (
              <div
                key={company.id}
                className="glass rounded-xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-white">{company.name}</h3>
                  <p className="text-slate-500 text-sm">
                    {company.owner?.email || "No owner"}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : company.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {company.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {company.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateCompanyStatus(company.id, "active")
                        }
                        disabled={actionLoading === company.id}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateCompanyStatus(company.id, "rejected")
                        }
                        disabled={actionLoading === company.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-3">
            {jobs.length === 0 && (
              <p className="text-slate-500 text-sm">No jobs</p>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-white">{job.title}</h3>
                  <p className="text-slate-500 text-sm">
                    {job.company?.name || "Unknown"}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : job.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateJobStatus(job.id, "active")}
                        disabled={actionLoading === job.id}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateJobStatus(job.id, "rejected")}
                        disabled={actionLoading === job.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-3">
            {transactions.length === 0 && (
              <p className="text-slate-500 text-sm">No transactions yet</p>
            )}
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="glass rounded-xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-white">
                    {tx.planId} · ${tx.amount} · {tx.cryptoType || "—"}
                  </h3>
                  <p className="text-slate-400 text-sm truncate">
                    {tx.user?.email} ({tx.user?.name || "—"})
                  </p>
                  <p className="text-slate-500 text-xs mt-1 break-all">
                    {tx.txHash || "no hash"}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : tx.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
                {tx.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updatePayment(tx.id, "confirmed")}
                      disabled={actionLoading === tx.id}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePayment(tx.id, "rejected")}
                      disabled={actionLoading === tx.id}
                      className="px-3 py-2 rounded-lg bg-red-600/80 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
