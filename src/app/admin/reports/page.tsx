"use client";

import Link from "next/link";
import {
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  ArrowLeft,
  Download,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

const monthlyData = [
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

export default function AdminReportsPage() {
  const { t } = useLocale();
  const latest = monthlyData[monthlyData.length - 1];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              {t("Dashboard.stats", "Reports")}
            </h1>
            <p className="text-slate-400 text-sm">
              {t("Dashboard.welcomeSub", "Monthly overview (demo data)")}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
          >
            <Download className="w-4 h-4" />
            {t("Common.save", "Export")}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: t("Nav.profile", "Users"),
              value: latest.users,
              icon: Users,
            },
            {
              label: t("Nav.jobs", "Jobs"),
              value: latest.jobs,
              icon: Briefcase,
            },
            {
              label: t("Nav.applications", "Applications"),
              value: latest.applications,
              icon: TrendingUp,
            },
            {
              label: t("Pricing.title", "Revenue"),
              value: `$${latest.revenue}`,
              icon: DollarSign,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="glass rounded-2xl p-5 border border-white/10"
            >
              <c.icon className="w-5 h-5 text-cyan-400 mb-2" />
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-slate-400 text-sm">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-white font-semibold mb-4">
            {t("Dashboard.stats", "Monthly trend")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left border-b border-white/10">
                  <th className="pb-2 pr-4">Month</th>
                  <th className="pb-2 pr-4">{t("Nav.profile", "Users")}</th>
                  <th className="pb-2 pr-4">{t("Nav.jobs", "Jobs")}</th>
                  <th className="pb-2 pr-4">
                    {t("Nav.applications", "Apps")}
                  </th>
                  <th className="pb-2">{t("Pricing.title", "Revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.month} className="border-b border-white/5">
                    <td className="py-2 text-white">{row.month}</td>
                    <td className="py-2 text-slate-300">{row.users}</td>
                    <td className="py-2 text-slate-300">{row.jobs}</td>
                    <td className="py-2 text-slate-300">{row.applications}</td>
                    <td className="py-2 text-slate-300">${row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10">
          <h2 className="text-white font-semibold mb-4">
            {t("Jobs.title", "Top jobs")}
          </h2>
          <ul className="space-y-3">
            {topJobs.map((j) => (
              <li
                key={j.title}
                className="flex flex-wrap justify-between gap-2 text-sm border-b border-white/5 pb-2"
              >
                <span className="text-slate-200">{j.title}</span>
                <span className="text-slate-500">
                  {j.applicants} apps · {j.views} views · {j.ctr}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
