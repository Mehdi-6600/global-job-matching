"use client";

import { useState } from "react";
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  Ban,
  MapPin,
  Users,
  Briefcase,
  Filter,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  email: string;
  location: string;
  employees: string;
  jobsPosted: number;
  applicants: number;
  status: "verified" | "pending" | "blocked";
  joined: string;
  logo: string;
}

const initialCompanies: Company[] = [
  {
    id: "1",
    name: "TechCorp",
    email: "hr@techcorp.com",
    location: "San Francisco, USA",
    employees: "50-200",
    jobsPosted: 12,
    applicants: 156,
    status: "verified",
    joined: "Jan 2024",
    logo: "TC",
  },
  {
    id: "2",
    name: "CloudScale",
    email: "jobs@cloudscale.io",
    location: "London, UK",
    employees: "200-500",
    jobsPosted: 8,
    applicants: 98,
    status: "verified",
    joined: "Mar 2024",
    logo: "CS",
  },
  {
    id: "3",
    name: "DataFlow",
    email: "hello@dataflow.ai",
    location: "Berlin, Germany",
    employees: "10-50",
    jobsPosted: 6,
    applicants: 72,
    status: "pending",
    joined: "Jun 2024",
    logo: "DF",
  },
  {
    id: "4",
    name: "Creative Studio",
    email: "team@creative.studio",
    location: "Paris, France",
    employees: "10-50",
    jobsPosted: 4,
    applicants: 45,
    status: "verified",
    joined: "Feb 2024",
    logo: "CR",
  },
  {
    id: "5",
    name: "QuickHire",
    email: "contact@quickhire.net",
    location: "Remote",
    employees: "1-10",
    jobsPosted: 2,
    applicants: 12,
    status: "blocked",
    joined: "Aug 2024",
    logo: "QH",
  },
  {
    id: "6",
    name: "NextGen Labs",
    email: "careers@nextgen.dev",
    location: "Toronto, Canada",
    employees: "500+",
    jobsPosted: 15,
    applicants: 210,
    status: "pending",
    joined: "Jul 2024",
    logo: "NG",
  },
];

const statusStyles = {
  verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "pending" | "blocked">("all");

  const filtered = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = (id: string, status: "verified" | "blocked") => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const verifiedCount = companies.filter((c) => c.status === "verified").length;
  const pendingCount = companies.filter((c) => c.status === "pending").length;
  const blockedCount = companies.filter((c) => c.status === "blocked").length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Companies</h1>
            <p className="text-slate-400 text-sm">Manage registered companies</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total", value: companies.length, color: "text-cyan-400" },
            { label: "Verified", value: verifiedCount, color: "text-emerald-400" },
            { label: "Pending", value: pendingCount, color: "text-amber-400" },
            { label: "Blocked", value: blockedCount, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
            >
              <option value="all" className="bg-slate-800">All Status</option>
              <option value="verified" className="bg-slate-800">Verified</option>
              <option value="pending" className="bg-slate-800">Pending</option>
              <option value="blocked" className="bg-slate-800">Blocked</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="glass rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-transparent hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <span className="text-cyan-400 font-bold text-sm">{comp.logo}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">{comp.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${statusStyles[comp.status]}`}
                    >
                      {comp.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{comp.email}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {comp.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {comp.employees}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {comp.jobsPosted} jobs
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {comp.status === "pending" && (
                  <button
                    onClick={() => updateStatus(comp.id, "verified")}
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify
                  </button>
                )}
                {comp.status !== "blocked" ? (
                  <button
                    onClick={() => updateStatus(comp.id, "blocked")}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/20 px-3 py-2 rounded-xl text-xs transition-all"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Block
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(comp.id, "verified")}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 px-3 py-2 rounded-xl text-xs transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Unblock
                  </button>
                )}
                <button className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No companies found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
