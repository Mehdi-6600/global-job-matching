"use client";

import { useState } from "react";
import {
  Briefcase,
  Users,
  Eye,
  TrendingUp,
  Plus,
  ArrowRight,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Clock3,
  Edit3,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface MyJob {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  applicants: number;
  views: number;
  status: "active" | "paused" | "closed";
  postedAt: string;
}

interface Applicant {
  id: string;
  name: string;
  role: string;
  appliedFor: string;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  appliedAt: string;
}

const myJobs: MyJob[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120k - $160k",
    applicants: 42,
    views: 1250,
    status: "active",
    postedAt: "2 days ago",
  },
  {
    id: "7",
    title: "Product Manager",
    location: "Remote",
    type: "Full-time",
    salary: "$140k - $180k",
    applicants: 18,
    views: 680,
    status: "active",
    postedAt: "3 days ago",
  },
  {
    id: "8",
    title: "UX Designer",
    location: "New York, NY",
    type: "Contract",
    salary: "$90k - $120k",
    applicants: 0,
    views: 120,
    status: "paused",
    postedAt: "1 week ago",
  },
];

const recentApplicants: Applicant[] = [
  { id: "a1", name: "Alice Johnson", role: "Frontend Dev", appliedFor: "Senior Frontend Developer", status: "pending", appliedAt: "10 min ago" },
  { id: "a2", name: "Bob Smith", role: "Full Stack", appliedFor: "Senior Frontend Developer", status: "reviewing", appliedAt: "2 hours ago" },
  { id: "a3", name: "Carol White", role: "Product Lead", appliedFor: "Product Manager", status: "accepted", appliedAt: "1 day ago" },
  { id: "a4", name: "David Lee", role: "UI Designer", appliedFor: "UX Designer", status: "rejected", appliedAt: "3 days ago" },
];

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  paused: { label: "Paused", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  closed: { label: "Closed", color: "text-slate-400", bg: "bg-white/5 border-white/10" },
};

const appStatusConfig = {
  pending: { label: "Pending", color: "text-amber-400", icon: Clock3 },
  reviewing: { label: "Reviewing", color: "text-cyan-400", icon: Eye },
  accepted: { label: "Accepted", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400", icon: XCircle },
};

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<MyJob[]>(myJobs);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "applicants">("overview");

  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicants, 0);
  const totalViews = jobs.reduce((sum, j) => sum + j.views, 0);
  const activeJobsCount = jobs.filter((j) => j.status === "active").length;

  const toggleJobStatus = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: j.status === "active" ? "paused" : "active" as const }
          : j
      )
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Employer Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage your job listings and applicants</p>
          </div>
          <Link
            href="/post-job"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Active Jobs", value: activeJobsCount, icon: Briefcase, color: "text-cyan-400" },
            { label: "Total Applicants", value: totalApplicants, icon: Users, color: "text-purple-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-amber-400" },
            { label: "Hire Rate", value: "12%", icon: TrendingUp, color: "text-emerald-400" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-slate-400 text-xs">{stat.label}</span>
                </div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {([
            { id: "overview" as const, label: "Overview" },
            { id: "jobs" as const, label: "My Jobs" },
            { id: "applicants" as const, label: "Applicants" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Recent Jobs</h2>
                <button
                  onClick={() => setActiveTab("jobs")}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => {
                  const st = statusConfig[job.status];
                  return (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <h4 className="text-white font-medium text-sm">{job.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {job.applicants}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {job.views}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg border ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Recent Applicants</h2>
                <button
                  onClick={() => setActiveTab("applicants")}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {recentApplicants.slice(0, 4).map((app) => {
                  const st = appStatusConfig[app.status];
                  const StatusIcon = st.icon;
                  return (
                    <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                          {app.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">{app.name}</h4>
                          <p className="text-slate-400 text-xs">{app.appliedFor}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-4">
            {jobs.map((job) => {
              const st = statusConfig[job.status];
              return (
                <div key={job.id} className="glass rounded-2xl p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          <span>{job.type}</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {job.salary}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {job.postedAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="w-3.5 h-3.5" />
                            {job.applicants} applicants
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Eye className="w-3.5 h-3.5" />
                            {job.views} views
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-lg border ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                      <button
                        onClick={() => toggleJobStatus(job.id)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title={job.status === "active" ? "Pause" : "Activate"}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "applicants" && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase">Applicant</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase">Applied For</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="p-4 text-xs font-medium text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplicants.map((app) => {
                    const st = appStatusConfig[app.status];
                    const StatusIcon = st.icon;
                    return (
                      <tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                              {app.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{app.name}</p>
                              <p className="text-slate-500 text-xs">{app.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 text-sm">{app.appliedFor}</td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {st.label}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xs">{app.appliedAt}</td>
                        <td className="p-4">
                          <Link
                            href={`/profile`}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors"
                          >
                            View
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
