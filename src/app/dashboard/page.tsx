"use client";

import { useState } from "react";
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
  MoreHorizontal,
} from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  status: "pending" | "interview" | "accepted" | "rejected";
  appliedDate: string;
  logo: string;
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
  salary: string;
  postedAt: string;
}

const stats: StatCard[] = [
  {
    title: "Total Applications",
    value: "24",
    change: "+12%",
    trend: "up",
    icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
  },
  {
    title: "Profile Views",
    value: "1,284",
    change: "+28%",
    trend: "up",
    icon: <Eye className="w-5 h-5 text-purple-400" />,
  },
  {
    title: "Saved Jobs",
    value: "18",
    change: "+5",
    trend: "up",
    icon: <Heart className="w-5 h-5 text-pink-400" />,
  },
  {
    title: "Response Rate",
    value: "68%",
    change: "+4%",
    trend: "up",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
  },
];

const applications: Application[] = [
  {
    id: "1",
    jobTitle: "Senior Frontend Developer",
    company: "TechCorp Global",
    status: "interview",
    appliedDate: "2 days ago",
    logo: "TC",
  },
  {
    id: "2",
    jobTitle: "Full Stack Engineer",
    company: "StartupHub",
    status: "pending",
    appliedDate: "5 days ago",
    logo: "SH",
  },
  {
    id: "3",
    jobTitle: "React Developer",
    company: "DataFlow",
    status: "accepted",
    appliedDate: "1 week ago",
    logo: "DF",
  },
  {
    id: "4",
    jobTitle: "UI Engineer",
    company: "Creative Studio",
    status: "rejected",
    appliedDate: "2 weeks ago",
    logo: "CS",
  },
];

const savedJobs: SavedJob[] = [
  {
    id: "1",
    title: "Backend Engineer",
    company: "CloudScale Inc",
    salary: "$130k - $170k",
    postedAt: "1 day ago",
  },
  {
    id: "2",
    title: "DevOps Specialist",
    company: "Tech Giants",
    salary: "$120k - $160k",
    postedAt: "3 days ago",
  },
];

const statusConfig = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  interview: {
    label: "Interview",
    icon: <Users className="w-4 h-4" />,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  accepted: {
    label: "Accepted",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
};

const sidebarItems = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", active: true },
  { icon: <Briefcase className="w-5 h-5" />, label: "My Applications", active: false },
  { icon: <Heart className="w-5 h-5" />, label: "Saved Jobs", active: false },
  { icon: <MessageSquare className="w-5 h-5" />, label: "Messages", active: false },
  { icon: <Bell className="w-5 h-5" />, label: "Notifications", active: false },
  { icon: <Settings className="w-5 h-5" />, label: "Settings", active: false },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Mobile Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden glass rounded-xl p-3 text-white mb-4 flex items-center gap-2"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Menu</span>
          </button>

          {/* Sidebar */}
          <aside
            className={`lg:w-64 shrink-0 ${sidebarOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="glass rounded-2xl p-4 sticky top-24">
              {/* User Profile Summary */}
              <div className="flex items-center gap-3 p-3 mb-4 border-b border-white/10 pb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  JD
                </div>
                <div>
                  <h3 className="text-white font-semibold">John Doe</h3>
                  <p className="text-slate-400 text-sm">Frontend Developer</p>
                </div>
              </div>

              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActiveTab(item.label.toLowerCase().replace(" ", "-"));
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      item.active
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/20"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Profile Completion */}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Profile</span>
                  <span className="text-sm text-cyan-400 font-semibold">85%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                </div>
                <p className="text-xs text-slate-400 mt-2">Add portfolio to reach 100%</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Welcome Header */}
            <div className="glass rounded-2xl p-6 md:p-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Welcome back, John! 👋
              </h1>
              <p className="text-slate-300">
                You have <span className="text-cyan-400 font-semibold">3 new notifications</span> and{" "}
                <span className="text-emerald-400 font-semibold">2 interview invites</span> this week.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="glass rounded-2xl p-5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5">{stat.icon}</div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        stat.trend === "up"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-red-400 bg-red-500/10"
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

            {/* Applications Table */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white">Recent Applications</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-cyan-500/50 w-full sm:w-48"
                    />
                  </div>
                  <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Job</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Applied</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {applications.map((app) => {
                      const status = statusConfig[app.status];
                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-300 text-sm font-bold">
                                {app.logo}
                              </div>
                              <div>
                                <h4 className="text-white font-medium text-sm">{app.jobTitle}</h4>
                                <p className="text-slate-400 text-xs">{app.company}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{app.appliedDate}</td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-white/10 text-center">
                <button className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors">
                  View All Applications →
                </button>
              </div>
            </div>

            {/* Saved Jobs & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Saved Jobs */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Saved Jobs</h2>
                  <button className="text-cyan-400 text-sm hover:text-cyan-300">View All</button>
                </div>
                <div className="space-y-4">
                  {savedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group"
                    >
                      <div>
                        <h4 className="text-white font-medium text-sm mb-1 group-hover:text-cyan-300 transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-slate-400 text-xs">{job.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-sm font-medium">{job.salary}</p>
                        <p className="text-slate-500 text-xs">{job.postedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Briefcase className="w-5 h-5" />, label: "Find Jobs", color: "from-cyan-500 to-blue-500" },
                    { icon: <Users className="w-5 h-5" />, label: "Network", color: "from-purple-500 to-pink-500" },
                    { icon: <TrendingUp className="w-5 h-5" />, label: "Analytics", color: "from-emerald-500 to-teal-500" },
                    { icon: <MessageSquare className="w-5 h-5" />, label: "Messages", color: "from-amber-500 to-orange-500" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all group"
                    >
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                        {action.icon}
                      </div>
                      <span className="text-slate-300 text-sm font-medium group-hover:text-white">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
