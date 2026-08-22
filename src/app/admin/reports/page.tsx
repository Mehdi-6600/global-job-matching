"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from "lucide-react";

interface MonthlyData {
  month: string;
  users: number;
  jobs: number;
  applications: number;
  revenue: number;
}

const monthlyData: MonthlyData[] = [
  { month: "Jan", users: 180, jobs: 45, applications: 320, revenue: 2400 },
  { month: "Feb", users: 220, jobs: 52, applications: 410, revenue: 3100 },
  { month: "Mar", users: 280, jobs: 68, applications: 520, revenue: 3800 },
  { month: "Apr", users: 340, jobs: 75, applications: 610, revenue: 4500 },
  { month: "May", users: 410, jobs: 82, applications: 720, revenue: 5200 },
  { month: "Jun", users: 480, jobs: 95, applications: 840, revenue: 6100 },
  { month: "Jul", users: 560, jobs: 110, applications: 980, revenue: 7200 },
  { month: "Aug", users: 650, jobs: 125, applications: 1150, revenue: 8400 },
];

const topJobs = [
  { title: "Senior Frontend Developer", applicants: 42, views: 1250, ctr: "3.4%" },
  { title: "Backend Engineer", applicants: 28, views: 890, ctr: "3.1%" },
  { title: "DevOps Engineer", applicants: 35, views: 950, ctr: "3.7%" },
  { title: "Product Manager", applicants: 18, views: 680, ctr: "2.6%" },
  { title: "Data Scientist", applicants: 22, views: 740, ctr: "3.0%" },
];

const topCompanies = [
  { name: "TechCorp", jobs: 12, applicants: 156, hireRate: "18%" },
  { name: "CloudScale", jobs: 8, applicants: 98, hireRate: "22%" },
  { name: "DataFlow", jobs: 6, applicants: 72, hireRate: "15%" },
  { name: "Creative Studio", jobs: 4, applicants: 45, hireRate: "25%" },
];

function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((val, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-lg ${color} transition-all`}
            style={{ height: `${(val / max) * 100}%`, opacity: 0.6 + (val / max) * 0.4 }}
          />
          <span className="text-[10px] text-slate-500">{monthlyData[idx].month}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("30d");

  const totalUsers = monthlyData.reduce((s, d) => s + d.users, 0);
  const totalJobs = monthlyData.reduce((s, d) => s + d.jobs, 0);
  const totalApps = monthlyData.reduce((s, d) => s + d.applications, 0);
  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Reports & Analytics</h1>
            <p className="text-slate-400 text-sm">Detailed platform performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
            >
              <option value="7d" className="bg-slate-800">Last 7 days</option>
              <option value="30d" className="bg-slate-800">Last 30 days</option>
              <option value="90d" className="bg-slate-800">Last 90 days</option>
              <option value="1y" className="bg-slate-800">Last year</option>
            </select>
            <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm transition-all">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "New Users", value: totalUsers.toLocaleString(), change: "+18%", up: true, icon: Users, color: "text-cyan-400" },
            { label: "Jobs Posted", value: totalJobs.toLocaleString(), change: "+12%", up: true, icon: Briefcase, color: "text-emerald-400" },
            { label: "Applications", value: totalApps.toLocaleString(), change: "+28%", up: true, icon: TrendingUp, color: "text-purple-400" },
            { label: "Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}k`, change: "+15%", up: true, icon: DollarSign, color: "text-amber-400" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-slate-400 text-xs">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <span className={`flex items-center gap-0.5 text-xs mt-1 ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">User Growth</h2>
            <BarChart data={monthlyData.map((d) => d.users)} color="bg-cyan-500" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Applications</h2>
            <BarChart data={monthlyData.map((d) => d.applications)} color="bg-purple-500" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Jobs Posted</h2>
            <BarChart data={monthlyData.map((d) => d.jobs)} color="bg-emerald-500" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Revenue</h2>
            <BarChart data={monthlyData.map((d) => d.revenue / 100)} color="bg-amber-500" />
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-5">Top Performing Jobs</h2>
            <div className="space-y-3">
              {topJobs.map((job, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white text-sm font-medium">{job.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>{job.applicants} applicants</span>
                      <span>{job.views} views</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-sm font-medium">{job.ctr}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-5">Top Companies</h2>
            <div className="space-y-3">
              {topCompanies.map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white text-sm font-medium">{comp.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>{comp.jobs} jobs</span>
                      <span>{comp.applicants} applicants</span>
                    </div>
                  </div>
                  <span className="text-cyan-400 text-sm font-medium">{comp.hireRate} hire</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
