"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Company {
  id: string;
  name: string;
  status: "active" | "pending" | "rejected";
  owner: string;
  jobs: number;
  location: string;
}

const companies: Company[] = [
  { id: "1", name: "TechCorp", status: "active", owner: "bob@example.com", jobs: 12, location: "San Francisco" },
  { id: "2", name: "DataFlow", status: "active", owner: "david@example.com", jobs: 8, location: "New York" },
  { id: "3", name: "CloudScale", status: "pending", owner: "david@example.com", jobs: 3, location: "Austin" },
  { id: "4", name: "Creative Studio", status: "rejected", owner: "bob@example.com", jobs: 0, location: "London" },
];

export default function AdminCompaniesPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || c.status === statusFilter;
    return matchQ && matchS;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" />
          {t("Nav.companies", "Companies")}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {t("Dashboard.welcomeSub", "Review company registrations (demo)")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Common.search", "Search...")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
          >
            <option value="all">{t("Jobs.filters", "All")}</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm">
              {t("Companies.noCompanies", "No companies")}
            </p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className="glass rounded-xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-medium text-white">{c.name}</h3>
                <p className="text-slate-500 text-sm">
                  {c.owner} · {c.location} · {c.jobs} {t("Companies.jobs", "jobs")}
                </p>
                <span
                  className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full ${
                    c.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : c.status === "pending"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {c.status === "pending" && <Clock className="w-3 h-3" />}
                  {c.status}
                </span>
              </div>
              {c.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"
                    title={t("Common.confirm", "Approve")}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-red-500/10 text-red-400"
                    title={t("Common.cancel", "Reject")}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
