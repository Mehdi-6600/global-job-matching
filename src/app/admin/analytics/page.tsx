"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  Briefcase,
  CheckCircle2,
  Building2,
  Mail,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  totalJobs: number;
  newJobs7d: number;
  totalApplications: number;
  newApplications7d: number;
  totalCompanies: number;
  totalSubscribers: number;
  totalTransactions: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.overview || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-slate-400">Failed to load analytics</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      change: `+${stats.newUsers7d} this week`,
      icon: <Users className="w-5 h-5 text-indigo-400" />,
      color: "from-indigo-500 to-purple-500",
    },
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      change: `+${stats.newJobs7d} this week`,
      icon: <Briefcase className="w-5 h-5 text-cyan-400" />,
      color: "from-cyan-500 to-blue-500",
    },
    {
      title: "Applications",
      value: stats.totalApplications,
      change: `+${stats.newApplications7d} this week`,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: "from-emerald-500 to-teal-500",
    },
    {
      title: "Companies",
      value: stats.totalCompanies,
      change: "Active",
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
      color: "from-amber-500 to-orange-500",
    },
    {
      title: "Subscribers",
      value: stats.totalSubscribers,
      change: "Newsletter",
      icon: <Mail className="w-5 h-5 text-pink-400" />,
      color: "from-pink-500 to-rose-500",
    },
    {
      title: "Transactions",
      value: stats.totalTransactions,
      change: "All time",
      icon: <DollarSign className="w-5 h-5 text-violet-400" />,
      color: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400 text-sm">Platform performance overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div
              key={card.title}
              className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10`}>
                  {card.icon}
                </div>
                <span className="text-xs text-slate-500 font-medium">{card.change}</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{card.value.toLocaleString()}</h3>
              <p className="text-slate-400 text-sm">{card.title}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10 mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" /> Growth Trends
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-slate-400 text-xs mb-1">New Users (7d)</p>
              <p className="text-2xl font-bold text-white">+{stats.newUsers7d}</p>
              <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs">
                <TrendingUp className="w-3 h-3" /> Last 7 days
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-slate-400 text-xs mb-1">New Users (30d)</p>
              <p className="text-2xl font-bold text-white">+{stats.newUsers30d}</p>
              <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs">
                <TrendingUp className="w-3 h-3" /> Last 30 days
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-slate-400 text-xs mb-1">Applications (7d)</p>
              <p className="text-2xl font-bold text-white">+{stats.newApplications7d}</p>
              <div className="flex items-center gap-1 mt-1 text-indigo-400 text-xs">
                <TrendingUp className="w-3 h-3" /> Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
