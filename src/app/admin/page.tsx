"use client";

import {
  Users,
  Briefcase,
  Eye,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Building2,
  Clock,
} from "lucide-react";

const stats = [
  { label: "Total Users", value: "2,847", change: "+12%", up: true, icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { label: "Active Jobs", value: "156", change: "+8%", up: true, icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Applications", value: "3,421", change: "+24%", up: true, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Revenue", value: "$12.4k", change: "-3%", up: false, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
];

const recentUsers = [
  { name: "Alice Johnson", email: "alice@example.com", role: "Job Seeker", joined: "2 min ago", status: "active" },
  { name: "Bob Smith", email: "bob@example.com", role: "Employer", joined: "15 min ago", status: "active" },
  { name: "Carol White", email: "carol@example.com", role: "Job Seeker", joined: "1 hour ago", status: "pending" },
  { name: "David Lee", email: "david@example.com", role: "Employer", joined: "3 hours ago", status: "active" },
];

const recentJobs = [
  { title: "Senior Frontend Developer", company: "TechCorp", posted: "10 min ago", status: "active", applicants: 42 },
  { title: "Backend Engineer", company: "DataFlow", posted: "1 hour ago", status: "pending", applicants: 8 },
  { title: "Product Manager", company: "CloudScale", posted: "3 hours ago", status: "active", applicants: 18 },
  { title: "UX Designer", company: "Creative Studio", posted: "5 hours ago", status: "rejected", applicants: 0 },
];

const activities = [
  { text: "New user registered: Alice Johnson", time: "2 min ago", icon: UserCheck, color: "text-cyan-400" },
  { text: "Job posted: Senior Frontend Developer", time: "10 min ago", icon: Briefcase, color: "text-emerald-400" },
  { text: "New application received for Backend Engineer", time: "25 min ago", icon: Activity, color: "text-purple-400" },
  { text: "User reported: suspicious activity", time: "1 hour ago", icon: Clock, color: "text-amber-400" },
  { text: "Job approved: Product Manager at CloudScale", time: "2 hours ago", icon: Building2, color: "text-cyan-400" },
];

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Overview of your platform performance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
                    {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Users */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Recent Users</h2>
              <a href="/admin/users" className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {recentUsers.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className="text-slate-500 text-xs">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${
                      user.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {user.status}
                    </span>
                    <p className="text-slate-500 text-[10px] mt-1">{user.joined}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Recent Jobs</h2>
              <a href="/admin/jobs" className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {recentJobs.map((job, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white text-sm font-medium">{job.title}</p>
                    <p className="text-slate-500 text-xs">{job.company} • {job.applicants} applicants</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${
                      job.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                      job.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    }`}>
                      {job.status}
                    </span>
                    <p className="text-slate-500 text-[10px] mt-1">{job.posted}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-5">Recent Activity</h2>
            <div className="space-y-4">
              {activities.map((act, idx) => {
                const Icon = act.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className={`w-4 h-4 ${act.color}`} />
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm">{act.text}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{act.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
