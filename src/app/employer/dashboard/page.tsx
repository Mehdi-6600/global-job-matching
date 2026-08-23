"use client";

import { useState } from "react";
import {
  Briefcase,
  Users,
  Eye,
  TrendingUp,
  Plus,
  Edit3,
  Pause,
  Play,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface PostedJob {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: string;
  applicants: number;
  views: number;
  status: "active" | "paused" | "closed";
  postedAt: string;
  deadline: string;
}

const postedJobs: PostedJob[] = [
  {
    id: "j1",
    title: "Senior Frontend Developer",
    location: "Remote",
    type: "Full-time",
    salary: "$120k - $150k",
    applicants: 42,
    views: 1250,
    status: "active",
    postedAt: "Aug 15, 2026",
    deadline: "Sep 15, 2026",
  },
  {
    id: "j2",
    title: "Backend Engineer",
    location: "London, UK",
    type: "Full-time",
    salary: "£80k - £100k",
    applicants: 28,
    views: 890,
    status: "active",
    postedAt: "Aug 10, 2026",
    deadline: "Sep 10, 2026",
  },
  {
    id: "j3",
    title: "UI/UX Designer",
    location: "Berlin, Germany",
    type: "Contract",
    salary: "€60k - €80k",
    applicants: 15,
    views: 540,
    status: "paused",
    postedAt: "Aug 05, 2026",
    deadline: "Sep 05, 2026",
  },
  {
    id: "j4",
    title: "DevOps Engineer",
    location: "Remote",
    type: "Full-time",
    salary: "$100k - $130k",
    applicants: 35,
    views: 950,
    status: "active",
    postedAt: "Jul 28, 2026",
    deadline: "Aug 28, 2026",
  },
  {
    id: "j5",
    title: "Product Manager",
    location: "Paris, France",
    type: "Full-time",
    salary: "€90k - €110k",
    applicants: 18,
    views: 680,
    status: "closed",
    postedAt: "Jul 20, 2026",
    deadline: "Aug 20, 2026",
  },
];

const recentApplicants = [
  { name: "Alice Johnson", role: "Senior Frontend Developer", time: "2h ago", status: "new" },
  { name: "Bob Smith", role: "Backend Engineer", time: "5h ago", status: "reviewed" },
  { name: "Carol White", role: "DevOps Engineer", time: "1d ago", status: "interview" },
  { name: "David Lee", role: "Senior Frontend Developer", time: "1d ago", status: "new" },
];

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<PostedJob[]>(postedJobs);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "closed">("all");

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const totalApplicants = jobs.reduce((s, j) => s + j.applicants, 0);
  const totalViews = jobs.reduce((s, j) => s + j.views, 0);
  const activeJobs = jobs.filter((j) => j.status === "active").length;

  const toggleStatus = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: j.status === "active" ? "paused" : "active" as any } : j
      )
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Employer Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage your job postings and applicants</p>
          </div>
          <a
            href="/employer/post-job"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Active Jobs", value: activeJobs, icon: Briefcase, color: "text-cyan-400" },
            { label: "Total Applicants", value: totalApplicants, icon: Users, color: "text-purple-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
            { label: "Hire Rate", value: "18%", icon: TrendingUp, color: "text-emerald-400" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-slate-400 text-xs">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-2">
              {(["all", "active", "paused", "closed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm">{job.title}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusStyles[job.status]}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(job.id)}
                        className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-amber-400 transition-colors"
                        title={job.status === "active" ? "Pause" : "Activate"}
                      >
                        {job.status === "active" ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-white font-medium">{job.applicants}</span> applicants
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-white font-medium">{job.views}</span> views
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 ml-auto">
                      <span>Deadline: {job.deadline}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Posted {job.postedAt}</span>
                    <a
                      href={`/jobs/${job.id}/applicants`}
                      className="flex items-center gap-1 text-cyan-400 text-xs hover:underline"
                    >
                      View Applicants
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No jobs found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Applicants */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Recent Applicants
              </h3>
              <div className="space-y-3">
                {recentApplicants.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                      <span className="text-cyan-400 text-[10px] font-bold">
                        {app.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{app.name}</p>
                      <p className="text-slate-500 text-[10px] truncate">{app.role}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        app.status === "new"
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : app.status === "interview"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
              <a
                href="/employer/applicants"
                className="flex items-center justify-center gap-1 text-cyan-400 text-xs mt-4 hover:underline"
              >
                View All Applicants
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>

            {/* Quick Tip */}
            <div className="glass rounded-2xl p-5 border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-white font-semibold text-sm">Pro Tip</h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Jobs with detailed descriptions and clear salary ranges get 40% more applicants.
                Make sure to add requirements and benefits!
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
