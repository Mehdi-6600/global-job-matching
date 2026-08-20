"use client";

import {
  Briefcase,
  Bookmark,
  MessageSquare,
  TrendingUp,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Bell,
  User,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const stats = [
  {
    label: "Applications Sent",
    value: "24",
    change: "+12%",
    icon: Briefcase,
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "Saved Jobs",
    value: "18",
    change: "+5%",
    icon: Bookmark,
    color: "from-purple-500 to-purple-600",
  },
  {
    label: "Profile Views",
    value: "142",
    change: "+28%",
    icon: Eye,
    color: "from-pink-500 to-pink-600",
  },
  {
    label: "Messages",
    value: "8",
    change: "+3",
    icon: MessageSquare,
    color: "from-emerald-500 to-emerald-600",
  },
];

const recentApplications = [
  {
    id: 1,
    role: "Senior Frontend Engineer",
    company: "TechFlow",
    status: "Interview",
    date: "2 days ago",
    statusColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: Clock,
  },
  {
    id: 2,
    role: "Product Designer",
    company: "PixelCraft",
    status: "Applied",
    date: "5 days ago",
    statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: CheckCircle2,
  },
  {
    id: 3,
    role: "Data Scientist",
    company: "DataMind",
    status: "Rejected",
    date: "1 week ago",
    statusColor: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  {
    id: 4,
    role: "Growth Marketing Manager",
    company: "ScaleUp",
    status: "Offer",
    date: "2 weeks ago",
    statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
];

const recommendedJobs = [
  {
    id: 1,
    title: "Full Stack Developer",
    company: "StartupXYZ",
    location: "Remote",
    match: "95%",
  },
  {
    id: 2,
    title: "UI Engineer",
    company: "DesignCo",
    location: "New York, NY",
    match: "88%",
  },
  {
    id: 3,
    title: "Frontend Lead",
    company: "BigTech",
    location: "San Francisco, CA",
    match: "82%",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <Navbar />

      <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-white/50 mt-1">
                Welcome back! Here's what's happening with your job search.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 glass rounded-xl hover:bg-white/20 transition-colors relative">
                <Bell className="w-5 h-5 text-white/70" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button className="flex items-center gap-3 glass rounded-xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white/80">
                  John Doe
                </span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-2xl p-6 hover:bg-white/[0.15] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Applications */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    Recent Applications
                  </h2>
                  <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <app.icon className="w-5 h-5 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {app.role}
                        </h3>
                        <p className="text-xs text-white/50">{app.company}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${app.statusColor}`}
                      >
                        {app.status}
                      </span>
                      <span className="text-xs text-white/30 hidden sm:block">
                        {app.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Chart Placeholder */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    Application Activity
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>+24% this month</span>
                  </div>
                </div>
                <div className="h-48 flex items-end justify-between gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map(
                    (height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-500/40 to-blue-400/60 hover:from-blue-500/60 hover:to-blue-400/80 transition-all duration-300 relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {height} apps
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="flex justify-between mt-3 text-xs text-white/30">
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>Jun</span>
                  <span>Sep</span>
                  <span>Dec</span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Completion */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Profile Completion
                </h2>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-white/5"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-blue-500"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="85, 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">85%</span>
                  </div>
                </div>
                <p className="text-center text-sm text-white/50 mb-4">
                  Complete your profile to increase visibility
                </p>
                <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors">
                  Complete Profile
                </button>
              </div>

              {/* Recommended Jobs */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Recommended for You
                </h2>
                <div className="space-y-3">
                  {recommendedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {job.title}
                        </h3>
                        <span className="text-xs font-medium text-emerald-400">
                          {job.match}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mb-2">
                        {job.company} • {job.location}
                      </p>
                      <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                        View Details →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  {[
                    "Update Resume",
                    "Set Job Alerts",
                    "Browse Companies",
                    "Interview Prep",
                  ].map((action) => (
                    <button
                      key={action}
                      className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
