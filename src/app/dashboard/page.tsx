"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  Heart,
  Settings,
  Bell,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
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
  location: string;
  remote: boolean;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  createdAt: string;
  company: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
}

interface ProfileData {
  name?: string;
  title?: string;
  headline?: string;
}

const sidebarItems = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    label: "Dashboard",
    href: "/dashboard",
    active: true,
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    label: "My Applications",
    href: "/my-applications",
    active: false,
  },
  {
    icon: <Heart className="w-5 h-5" />,
    label: "Saved Jobs",
    href: "/saved-jobs",
    active: false,
  },
  {
    icon: <Settings className="w-5 h-5" />,
    label: "Settings",
    href: "/settings",
    active: false,
  },
];

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
) {
  const cur = currency || "USD";
  if (min == null && max == null) return "Not specified";
  if (min != null && max != null) {
    return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `From ${cur} ${min.toLocaleString()}`;
  return `Up to ${cur} ${max!.toLocaleString()}`;
}

function getLogo(name?: string | null): string {
  if (!name) return "?";
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
  const [appCount, setAppCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs?limit=6").then((r) => r.json()),
      fetch("/api/profile")
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("/api/applications")
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .catch(() => ({ count: 0 })),
      fetch("/api/saved-jobs")
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .catch(() => ({ count: 0 })),
    ])
      .then(([jobsData, profileData, appsData, savedData]) => {
        if (jobsData.jobs) setJobs(jobsData.jobs);
        if (jobsData.pagination?.total != null) {
          setTotalJobs(jobsData.pagination.total);
        } else if (jobsData.jobs) {
          setTotalJobs(jobsData.jobs.length);
        }
        if (profileData.profile) setProfile(profileData.profile);
        else if (profileData.user) setProfile(profileData.user);
        setAppCount(appsData.count ?? appsData.applications?.length ?? 0);
        setSavedCount(savedData.count ?? savedData.jobs?.length ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    {
      title: "Available Jobs",
      value: totalJobs.toString(),
      change: "Live",
      trend: "up" as const,
      icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
      href: "/jobs",
    },
    {
      title: "My Applications",
      value: appCount.toString(),
      change: "Track",
      trend: "neutral" as const,
      icon: <CheckCircle2 className="w-5 h-5 text-purple-400" />,
      href: "/my-applications",
    },
    {
      title: "Saved Jobs",
      value: savedCount.toString(),
      change: "Bookmarked",
      trend: "neutral" as const,
      icon: <Heart className="w-5 h-5 text-pink-400" />,
      href: "/saved-jobs",
    },
    {
      title: "Profile",
      value: profile?.name ? "Ready" : "Setup",
      change: "Edit",
      trend: "neutral" as const,
      icon: <Eye className="w-5 h-5 text-emerald-400" />,
      href: "/settings",
    },
  ];

  const userName = profile?.name || "Job Seeker";
  const userTitle =
    profile?.title || profile?.headline || "Welcome to your dashboard";

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
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden glass rounded-xl p-3 text-white mb-4 flex items-center gap-2 w-fit"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Menu</span>
          </button>

          <aside
            className={`lg:w-64 shrink-0 ${sidebarOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="glass rounded-2xl p-4 sticky top-24 border border-white/10">
              <div className="flex items-center gap-3 p-3 mb-4 border-b border-white/10 pb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{userName}</h3>
                  <p className="text-slate-400 text-sm line-clamp-1">
                    {userTitle}
                  </p>
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
                  <span className="text-sm text-slate-300">Quick links</span>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/jobs"
                    className="block text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Browse jobs →
                  </Link>
                  <Link
                    href="/my-applications"
                    className="block text-xs text-slate-400 hover:text-white"
                  >
                    Track applications →
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            <div className="glass rounded-2xl p-6 md:p-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Welcome back, {userName.split(" ")[0]}!
              </h1>
              <p className="text-slate-300">
                There are{" "}
                <span className="text-cyan-400 font-semibold">
                  {totalJobs} active jobs
                </span>{" "}
                on the platform. Apply and track everything from here.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Link
                  key={stat.title}
                  href={stat.href}
                  className="glass rounded-2xl p-5 hover:bg-white/10 transition-all border border-white/10"
                >
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
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-slate-400 text-sm">{stat.title}</p>
                </Link>
              ))}
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-bold text-white">Latest Jobs</h2>
                </div>
                <Link
                  href="/jobs"
                  className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  Browse All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="glass rounded-xl p-4 border border-transparent hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-300 text-xs font-bold">
                            {getLogo(job.company?.name)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm group-hover:text-cyan-300 transition-colors">
                              {job.title}
                            </h4>
                            <p className="text-slate-400 text-xs flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {job.company?.name || "Company"}
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
                          {formatSalary(
                            job.currency,
                            job.salaryMin,
                            job.salaryMax
                          )}
                        </span>
                        {job.type && (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                            {job.type}
                          </span>
                        )}
                        {job.remote && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            Remote
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No jobs to show yet.{" "}
                  <Link href="/jobs" className="text-cyan-400">
                    Browse jobs
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
