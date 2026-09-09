"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  applicants: number;
  views: number;
  status: "active" | "pending" | "rejected" | "closed";
  postedAt: string;
  postedBy: string;
}

const jobs: Job[] = [
  { id: "1", title: "Senior Frontend Developer", company: "TechCorp", location: "San Francisco, CA", type: "Full-time", salary: "$120k - $160k", applicants: 42, views: 1250, status: "active", postedAt: "2 days ago", postedBy: "bob@example.com" },
  { id: "2", title: "Backend Engineer", company: "DataFlow", location: "New York, NY", type: "Full-time", salary: "$130k - $170k", applicants: 28, views: 890, status: "active", postedAt: "1 day ago", postedBy: "david@example.com" },
  { id: "7", title: "Product Manager", company: "CloudScale", location: "Remote", type: "Full-time", salary: "$140k - $180k", applicants: 18, views: 680, status: "pending", postedAt: "3 days ago", postedBy: "david@example.com" },
  { id: "8", title: "UX Designer", company: "Creative Studio", location: "London, UK", type: "Contract", salary: "£70k - £90k", applicants: 0, views: 120, status: "rejected", postedAt: "5 days ago", postedBy: "bob@example.com" },
  { id: "9", title: "DevOps Engineer", company: "CloudScale", location: "Austin, TX", type: "Full-time", salary: "$140k - $180k", applicants: 35, views: 950, status: "active", postedAt: "1 week ago", postedBy: "david@example.com" },
  { id: "10", title: "Data Scientist", company: "TechCorp", location: "Remote", type: "Full-time", salary: "$150k - $200k", applicants: 22, views: 740, status: "pending", postedAt: "1 week ago", postedBy: "bob@example.com" },
];

export default function AdminJobsPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || j.status === statusFilter;
    return matchQ && matchS;
  });

  const statusConfig = {
    active: {
      label: t("Jobs.active", "Active"),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      icon: CheckCircle2,
    },
    pending: {
      label: t("Jobs.pending", "Pending"),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      icon: Clock,
    },
    rejected: {
      label: t("Common.cancel", "Rejected"),
      color: "text-red-400",
      bg: "bg-red-500/10",
      icon: XCircle,
    },
    closed: {
      label: t("Common.close", "Closed"),
      color: "text-slate-400",
      bg: "bg-white/5",
      icon: XCircle,
    },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t("Nav.jobs", "Jobs")}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {t("Dashboard.welcomeSub", "Moderate job listings (demo data)")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Common.search", "Search jobs...")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500"
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
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-left">
                  <th className="p-4">{t("Jobs.title", "Title")}</th>
                  <th className="p-4">{t("Nav.companies", "Company")}</th>
                  <th className="p-4">{t("Jobs.location", "Location")}</th>
                  <th className="p-4">{t("Common.status", "Status")}</th>
                  <th className="p-4">{t("Nav.applications", "Apps")}</th>
                  <th className="p-4">{t("Common.edit", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const st = statusConfig[job.status];
                  const Icon = st.icon;
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-4 text-white font-medium">{job.title}</td>
                      <td className="p-4 text-slate-400">{job.company}</td>
                      <td className="p-4 text-slate-400 text-xs">
                        {job.location}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${st.bg} ${st.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{job.applicants}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400"
                            title={t("Common.view", "View")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {job.status === "pending" && (
                            <button
                              type="button"
                              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400"
                              title={t("Common.confirm", "Approve")}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {job.status !== "rejected" && (
                            <button
                              type="button"
                              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400"
                              title={t("Common.cancel", "Reject")}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400"
                            title={t("Common.delete", "Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                {t("Jobs.noJobs", "No jobs found")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-slate-400 text-xs">
              {filtered.length} / {jobs.length}
            </p>
            <div className="flex gap-2">
              <button type="button" className="p-2 rounded-lg bg-white/5 text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 rounded-lg bg-white/5 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
