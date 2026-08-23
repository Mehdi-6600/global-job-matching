"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  Heart,
  MessageSquare,
  Settings,
  Bell,
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  Sparkles,
  MapPin,
  DollarSign,
  Building2,
  ArrowRight,
} from "lucide-react";

interface ApiJob {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  status: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
  };
}

interface ProfileData {
  name: string;
  title: string;
  headline?: string;
  skills?: string[];
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  applied: {
    label: "Applied",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  viewed: {
    label: "Viewed",
    icon: <Eye className="w-4 h-4" />,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  interview: {
    label: "Interview",
    icon: <Users className="w-4 h-4" />,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  hired: {
    label: "Hired",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
};

const sidebarItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/dashboard", active: true },
  { icon: <Briefcase className="w-5 h-5" />, label: "My Applications", href: "/my-applications", active: false },
  { icon: <Heart className="w-5 h-5" />, label: "Saved Jobs", href: "/saved-jobs", active: false },
  { icon: <MessageSquare className="w-5 h-5" />, label: "Messages", href: "/messages", active: false },
  { icon: <Bell className="w-5 h-5" />, label: "Notifications", href: "/notifications", active: false },
  { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings", active: false },
];

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()).catch(() => ({ profile: null })),
    ])
      .then(([jobsData, profileData]) => {
        if (jobsData.jobs) setJobs(jobsData.jobs);
        if (profileData.profile) setProfile(profileData.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const recentJobs = jobs.slice(0, 6);
  const totalJobs = jobs.length;
  const savedCount = 0; // TODO: connect to saved jobs API
  const appCount = 0;   // TODO: connect to applications API

  const stats = [
    {
      title: "Available Jobs",
      value: totalJobs.toString(),
      change: "Live",
      trend: "up" as const,
      icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: "My Applications",
      value: appCount.toString(),
      change: "Pending",
      trend: "neutral" as const,
      icon: <CheckCircle2 className="w-5 h-5 text-purple-400" />,
    },
    {
      title: "Saved Jobs",
      value: savedCount.toString(),
      change: "Bookmarked",
      trend: "neutral" as const,
      icon: <Heart className="w-5 h-5 text-pink-400" />,
    },
    {
      title: "Profile Views",
      value: "0",
      change: "Coming soon",
      trend: "neutral" as const,
      icon: <Eye className="w-5 h-5 text-emerald-400" />,
    },
  ];

  const userName = profile?.name || "Job Seeker";
  const userTitle = profile?.title || profile?.headline || "Welcome to your dashboard";

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden glass rounded-xl p-3 text-white mb-4 flex items-center gap-2 w-fit"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Menu</span>
          </button>

          {/* Sidebar */}
          <aside className={`lg:w-64 shrink-0 ${sidebarOpen ? "block" : "hidden lg:block"}`}>
            <div className="glass rounded-2xl p-4 sticky top-24">
              <div className="flex items-center gap-3 p-3 mb-4 border-b border-white/10 pb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{userName}</h3>
                  <p className="text-slate-400 text-sm">{userTitle}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      item.active
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/20"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Profile</span>
                  <span className="text-sm text-cyan-400 font-semibold">60%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[60%] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                </div>
                <p className="text-xs text-slate-400 mt-2">Complete your profile for better matches</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Welcome */}
            <div className="glass rounded-2xl p-6 md:p-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Welcome back, {userName.split(" ")[0]}! 👋
              </h1>
              <p className="text-slate-300">
                There are <span className="text-cyan-400 font-semibold">{totalJobs} active jobs</span> matching your profile.
                Keep your profile updated for better recommendations.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.title} className="glass rounded-2xl p-5 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5">{stat.icon}</div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        stat.trend === "up"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-slate-400 bg-white/5"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                  <p className="text-slate-400 text-sm">{stat.title}</p>
                </div>
              ))}
            </div>

            {/* Recommended Jobs */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-bold text-white">Recommended Jobs</h2>
                </div>
                <Link
                  href="/jobs"
                  className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  Browse All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {recentJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {recentJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="glass rounded-xl p-4 border border-transparent hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-300 text-xs font-bold">
                            {getLogo(job.company.name)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm group-hover:text-cyan-300 transition-colors">
                              {job.title}
                            </h4>
                            <p className="text-slate-400 text-xs flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {job.company.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.currency}{(job.salaryMin ?? 0).toLocaleString()} - {(job.salaryMax ?? 0).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                          {job.type}
                        </span>
                        {job.remote && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            Remote
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {job.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium mb-1">No jobs found</p>
                  <p className="text-slate-500 text-sm mb-4">Check back later for new opportunities</p>
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium"
                  >
                    Browse Jobs
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Briefcase className="w-5 h-5" />, label: "Find Jobs", href: "/jobs", color: "from-cyan-500 to-blue-500" },
                  { icon: <Users className="w-5 h-5" />, label: "Companies", href: "/companies", color: "from-purple-500 to-pink-500" },
                  { icon: <TrendingUp className="w-5 h-5" />, label: "Pricing", href: "/pricing", color: "from-emerald-500 to-teal-500" },
                  { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings", color: "from-amber-500 to-orange-500" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
                  >
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                      {action.icon}
                    </div>
                    <span className="text-slate-300 text-sm font-medium group-hover:text-white">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
