"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Bookmark,
  Eye,
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";

// Mock data for demo — replace with real data hooks
const stats = [
  {
    label: "Total Applications",
    value: "24",
    change: "+12%",
    icon: Briefcase,
    color: "from-[#3B82F6] to-[#60A5FA]",
  },
  {
    label: "Saved Jobs",
    value: "18",
    change: "+5",
    icon: Bookmark,
    color: "from-[#8B5CF6] to-[#A78BFA]",
  },
  {
    label: "Profile Views",
    value: "142",
    change: "+28%",
    icon: Eye,
    color: "from-[#10B981] to-[#34D399]",
  },
  {
    label: "Match Score",
    value: "87%",
    change: "+3%",
    icon: TrendingUp,
    color: "from-[#F59E0B] to-[#FBBF24]",
  },
];

const recentJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    salary: "$120K - $160K",
    type: "Full-time",
    postedAt: "2h ago",
    source: "remoteok",
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: "2",
    title: "Product Designer",
    company: "DesignStudio",
    location: "Berlin, Germany",
    salary: "€70K - €90K",
    type: "Full-time",
    postedAt: "5h ago",
    source: "arbeitnow",
    tags: ["Figma", "UI/UX", "Design Systems"],
  },
  {
    id: "3",
    title: "Data Engineer",
    company: "DataFlow",
    location: "London, UK",
    salary: "£80K - £110K",
    type: "Contract",
    postedAt: "1d ago",
    source: "jooble",
    tags: ["Python", "SQL", "AWS"],
  },
];

const activities = [
  { action: "Applied to", target: "Senior Frontend Developer at TechCorp", time: "2h ago" },
  { action: "Saved", target: "Product Designer at DesignStudio", time: "5h ago" },
  { action: "Profile viewed by", target: "DataFlow recruiter", time: "1d ago" },
  { action: "Match found", target: "Data Engineer at DataFlow", time: "2d ago" },
];

function sourceBadge(source: string) {
  const map: Record<string, string> = {
    arbeitnow: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
    remoteok: "bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20",
    jooble: "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20",
  };
  return map[source] || "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="glass-section p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  Dashboard
                </h1>
                <p className="text-[var(--text-muted)] mt-1">
                  Welcome back! Here&apos;s what&apos;s happening with your job search.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/jobs"
                  className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Jobs
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass-card group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-glow`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="glass-section p-2 flex items-center gap-1">
                {["overview", "saved", "applications"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all capitalize ${
                      activeTab === tab
                        ? "bg-[#3B82F6] text-white shadow-glow"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Recent Jobs */}
              <div className="glass-section p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#3B82F6]" />
                    Recommended Jobs
                  </h2>
                  <Link
                    href="/jobs"
                    className="text-sm text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="glass p-4 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all group cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow shrink-0">
                          {job.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#3B82F6] transition-colors">
                              {job.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sourceBadge(
                                job.source
                              )}`}
                            >
                              {job.source}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">
                            {job.company}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {job.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {job.salary}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {job.postedAt}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.tags.map((tag) => (
                              <span key={tag} className="glass-pill text-[10px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Link
                          href="#"
                          className="shrink-0 w-9 h-9 rounded-lg glass flex items-center justify-center text-[var(--text-muted)] hover:text-[#3B82F6] hover:glow-primary transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics Placeholder */}
              <div className="glass-section p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-[#8B5CF6]" />
                  Application Analytics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass p-5 rounded-xl text-center">
                    <PieChart className="w-8 h-8 text-[#3B82F6] mx-auto mb-3" />
                    <div className="text-2xl font-bold text-[var(--text-primary)]">8</div>
                    <div className="text-xs text-[var(--text-muted)]">Pending</div>
                  </div>
                  <div className="glass p-5 rounded-xl text-center">
                    <Activity className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-[var(--text-primary)]">12</div>
                    <div className="text-xs text-[var(--text-muted)]">Interviewing</div>
                  </div>
                  <div className="glass p-5 rounded-xl text-center">
                    <TrendingUp className="w-8 h-8 text-[#8B5CF6] mx-auto mb-3" />
                    <div className="text-2xl font-bold text-[var(--text-primary)]">4</div>
                    <div className="text-xs text-[var(--text-muted)]">Offers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — 1/3 */}
            <div className="space-y-6">
              {/* Activity Feed */}
              <div className="glass-section p-6">
                <h2 className="text-lg font-semibold mb-5">Recent Activity</h2>
                <div className="space-y-4">
                  {activities.map((activity, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6] mt-2 shrink-0 shadow-glow" />
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">
                          <span className="font-medium">{activity.action}</span>{" "}
                          <span className="text-[var(--text-secondary)]">
                            {activity.target}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-section p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    href="/jobs"
                    className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                      <Search className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Search Jobs
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Find new opportunities
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#3B82F6] transition-colors" />
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Update Profile
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Improve your match score
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#8B5CF6] transition-colors" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Upgrade Plan
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Unlock premium features
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" />
                  </Link>
                </div>
              </div>

              {/* Match Score Card */}
              <div className="glass-section p-6 text-center">
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <span className="text-2xl font-bold text-white">87%</span>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                  Profile Match Score
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Your profile is 87% complete. Add more skills to improve matching.
                </p>
                <Link
                  href="/profile"
                  className="btn-secondary text-sm py-2.5 w-full block"
                >
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
