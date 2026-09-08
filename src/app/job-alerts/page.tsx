"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  Search,
  MapPin,
  Briefcase,
  Globe,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Alert {
  id: string;
  keywords: string | null;
  location: string | null;
  remote: boolean | null;
  type: string | null;
  minSalary: number | null;
  active: boolean;
  createdAt: string;
}

export default function JobAlertsPage() {
  const { t, locale } = useLocale();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    keywords: "",
    location: "",
    type: "",
    remote: false,
    minSalary: "",
  });

  useEffect(() => {
    void fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/job-alerts");
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/job-alerts";
        return;
      }
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({
          keywords: "",
          location: "",
          type: "",
          remote: false,
          minSalary: "",
        });
        setShowForm(false);
        await fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm(t("Common.delete", "Delete") + "?")) return;
    try {
      const res = await fetch(`/api/job-alerts?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-2xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-7 h-7 text-indigo-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {t("Nav.jobAlerts", "Job alerts")}
                </h1>
                <p className="text-slate-400 text-sm">
                  {t(
                    "Jobs.subtitle",
                    "Get notified when new jobs match your criteria"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("Common.submit", "New Alert")}
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("Common.back", "Back")}
              </Link>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={createAlert}
            className="glass rounded-2xl p-6 mb-6 border border-white/10 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {t("Nav.jobAlerts", "Job alerts")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t("Jobs.searchPlaceholder", "Keywords")}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t(
                      "Jobs.tagPlaceholder",
                      "e.g. React Developer"
                    )}
                    value={form.keywords}
                    onChange={(e) =>
                      setForm({ ...form, keywords: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t("Jobs.location", "Location")}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t(
                      "Jobs.locationPlaceholder",
                      "Any location"
                    )}
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t("Jobs.jobType", "Job Type")}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">{t("Jobs.allTypes", "All Types")}</option>
                  <option value="full-time">
                    {t("Jobs.types.fullTime", "Full-time")}
                  </option>
                  <option value="part-time">
                    {t("Jobs.types.partTime", "Part-time")}
                  </option>
                  <option value="contract">
                    {t("Jobs.types.contract", "Contract")}
                  </option>
                  <option value="remote">
                    {t("Common.remote", "Remote")}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t("Jobs.minSalary", "Min Salary")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    placeholder="0"
                    value={form.minSalary}
                    onChange={(e) =>
                      setForm({ ...form, minSalary: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all w-fit">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) =>
                  setForm({ ...form, remote: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600"
              />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  {t("Jobs.remoteOnly", "Remote only")}
                </span>
              </div>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
              >
                {saving
                  ? t("Common.loading", "Saving...")
                  : t("Common.save", "Create Alert")}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm font-medium transition-all"
              >
                {t("Common.cancel", "Cancel")}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-white/10">
              <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">
                {t("Common.noResults", "No alerts yet")}
              </h3>
              <p className="text-slate-400 text-sm">
                {t(
                  "Jobs.subtitle",
                  "Create an alert to get notified about new jobs"
                )}
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="glass rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-white">
                      {alert.keywords || t("Jobs.title", "All jobs")}
                    </h3>
                    {alert.active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("Common.success", "Active")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {alert.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {alert.location}
                      </span>
                    )}
                    {alert.type && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {alert.type}
                      </span>
                    )}
                    {alert.remote && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {t("Common.remote", "Remote")}
                      </span>
                    )}
                    {alert.minSalary != null && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {t("Jobs.from", "From")} $
                        {alert.minSalary.toLocaleString(locale)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={t("Common.delete", "Delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
