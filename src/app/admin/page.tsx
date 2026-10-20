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
  CreditCard,
  RefreshCw,
  Database,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

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
  const { t, locale } = useLocale();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.status === 403) {
      setError(t("Common.forbidden", "Forbidden — not admin"));
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
      <div className="gjm-page">
        <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
        <span className="sr-only">{t("Common.loading", "Loading...")}</span>
      </div>
    );
  }

  const tabs = [
    {
      id: "overview" as const,
      label: t("Dashboard.stats", "Overview"),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "users" as const,
      label: t("Nav.profile", "Users"),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "companies" as const,
      label: t("Nav.companies", "Companies"),
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: "jobs" as const,
      label: t("Nav.jobs", "Jobs"),
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: "payments" as const,
      label: t("Pricing.title", "Payments"),
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  return (
    <div className="gjm-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("Nav.admin", "Admin Panel")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Dashboard.welcomeSub", "Manage platform settings")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/sync"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--success-soft)] border border-[var(--success)] text-[var(--success)] hover:bg-[var(--success-soft)] transition-all text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Sync
            </Link>
            <Link
              href="/admin/source-companies"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-primary-soft)] border border-[var(--border)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] transition-all text-sm font-medium"
            >
              <Database className="w-4 h-4" /> Sources
            </Link>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] transition-all text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" />{" "}
              {t("Dashboard.stats", "Analytics")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm">
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
                  ? "bg-[var(--brand-accent)] text-[var(--text-on-brand)]"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
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
                label: t("Nav.profile", "Total Users"),
                value: stats.totalUsers,
                icon: <Users className="w-5 h-5 text-[var(--brand-accent)]" />,
                color: "from-[var(--brand-accent)] to-[var(--brand-accent-hover)]",
              },
              {
                label: t("Nav.companies", "Total Companies"),
                value: stats.totalCompanies,
                icon: <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />,
                color: "bg-[image:var(--gradient-brand)]",
              },
              {
                label: t("Nav.jobs", "Total Jobs"),
                value: stats.totalJobs,
                icon: <Briefcase className="w-5 h-5 text-[var(--success)]" />,
                color: "from-[var(--success)] to-[var(--success-hover)]",
              },
              {
                label: t("Nav.applications", "Total Applications"),
                value: stats.totalApplications,
                icon: <CheckCircle2 className="w-5 h-5 text-[var(--warning)]" />,
                color: "from-[var(--warning)] to-[var(--warning-hover)]",
              },
              {
                label: t("Companies.pending", "Pending Companies"),
                value: stats.pendingCompanies,
                icon: <Building2 className="w-5 h-5 text-[var(--brand-accent)]" />,
                color: "from-[var(--brand-accent)] to-[var(--error)]",
              },
              {
                label: t("Jobs.pending", "Pending Jobs"),
                value: stats.pendingJobs,
                icon: <Briefcase className="w-5 h-5 text-[var(--brand-accent)]" />,
                color: "from-[var(--brand-accent)] to-[var(--brand-accent-hover)]",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="glass rounded-2xl p-5 border border-[var(--border)]"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center mb-3`}
                >
                  {card.icon}
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
                <p className="text-[var(--text-muted)] text-sm">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "users" && (
          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                    <th className="p-4 font-medium">
                      {t("Auth.name", "Name")}
                    </th>
                    <th className="p-4 font-medium">
                      {t("Auth.email", "Email")}
                    </th>
                    <th className="p-4 font-medium">
                      {t("Profile.role", "Role")}
                    </th>
                    <th className="p-4 font-medium">
                      {t("Pricing.title", "Plan")}
                    </th>
                    <th className="p-4 font-medium">
                      {t("JobDetail.posted", "Joined")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--border-soft)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <td className="p-4 text-[var(--text-primary)]">{user.name || "—"}</td>
                      <td className="p-4 text-[var(--text-muted)]">{user.email}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-body)] text-xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-muted)] text-xs">
                        {user.plan || "free"}
                      </td>
                      <td className="p-4 text-[var(--text-muted)]">
                        {new Date(user.createdAt).toLocaleDateString(locale)}
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
              <p className="text-[var(--text-muted)] text-sm">
                {t("Companies.noCompanies", "No companies")}
              </p>
            )}
            {companies.map((company) => (
              <div
                key={company.id}
                className="glass rounded-xl p-5 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-[var(--text-primary)]">{company.name}</h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    {company.owner?.email || t("Common.noResults", "No owner")}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.status === "active"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : company.status === "pending"
                          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "bg-[var(--error-soft)] text-[var(--error)]"
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
                        className="p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)] transition-colors"
                        aria-label={t("Common.confirm", "Approve")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateCompanyStatus(company.id, "rejected")
                        }
                        disabled={actionLoading === company.id}
                        className="p-2 rounded-lg bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error-soft)] transition-colors"
                        aria-label={t("Common.cancel", "Reject")}
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
              <p className="text-[var(--text-muted)] text-sm">
                {t("Jobs.noJobs", "No jobs")}
              </p>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass rounded-xl p-5 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-[var(--text-primary)]">{job.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    {job.company?.name || t("Common.noResults", "Unknown")}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === "active"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : job.status === "pending"
                          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "bg-[var(--error-soft)] text-[var(--error)]"
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
                        className="p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)] transition-colors"
                        aria-label={t("Common.confirm", "Approve")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateJobStatus(job.id, "rejected")}
                        disabled={actionLoading === job.id}
                        className="p-2 rounded-lg bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error-soft)] transition-colors"
                        aria-label={t("Common.cancel", "Reject")}
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
              <p className="text-[var(--text-muted)] text-sm">
                {t("Common.noResults", "No transactions yet")}
              </p>
            )}
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="glass rounded-xl p-5 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)]">
                    {tx.planId} · ${tx.amount} · {tx.cryptoType || "—"}
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm truncate">
                    {tx.user?.email} ({tx.user?.name || "—"})
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-1 break-all">
                    {tx.txHash || "—"}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === "confirmed"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : tx.status === "pending"
                          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "bg-[var(--error-soft)] text-[var(--error)]"
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
                      className="px-3 py-2 rounded-lg bg-[var(--success)] text-[var(--text-on-brand)] text-xs font-medium hover:bg-[var(--success)] disabled:opacity-50"
                    >
                      {t("Common.confirm", "Confirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePayment(tx.id, "rejected")}
                      disabled={actionLoading === tx.id}
                      className="px-3 py-2 rounded-lg bg-[var(--error)] text-[var(--text-on-brand)] text-xs font-medium hover:bg-[var(--error)] disabled:opacity-50"
                    >
                      {t("Common.cancel", "Reject")}
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
