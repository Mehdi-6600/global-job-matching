"use client";

import { useState } from "react";
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

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

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  closed: { label: "Closed", color: "text-slate-400", bg: "bg-white/5 border-white/10", icon: XCircle },
};

export default function AdminJobsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Jobs</h1>
            <p className="text-slate-400 text-sm">Moderate and manage job listings</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="glass px-3 py-1.5 rounded-lg text-slate-400">Total: {jobs.length}</span>
            <span className="glass px-3 py-1.5 rounded-lg text-emerald-400">Active: {jobs.filter((j) => j.status === "active").length}</span>
            <span className="glass px-3 py-1.5 rounded-lg text-amber-400">Pending: {jobs.filter((j) => j.status === "pending").length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs or companies..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {["all", "active", "pending", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === s
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Job</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Company</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase text-center">Stats</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Posted</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const st = statusConfig[job.status];
                  const StatusIcon = st.icon;
                  return (
                    <tr key={job.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{job.title}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                              </span>
                              <span>{job.type}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-300 text-sm">{job.company}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{job.postedBy}</p>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border ${st.bg} ${st.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {job.applicants}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {job.views}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 text-xs">{job.postedAt}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title="View"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {job.status === "pending" && (
                            <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Approve">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {job.status !== "rejected" && (
                            <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
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
              <p className="text-slate-400 text-sm">No jobs found matching your filters.</p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-slate-400 text-xs">Showing {filtered.length} of {jobs.length} jobs</p>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
