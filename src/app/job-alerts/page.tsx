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
      <div className="gjm-page">
        <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="gjm-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-2xl p-6 mb-6 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-7 h-7 text-[var(--brand-accent)]" />
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {t("Nav.jobAlerts", "Job alerts")}
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("Common.submit", "New Alert")}
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] transition-all text-sm font-medium"
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
            className="glass rounded-2xl p-6 mb-6 border border-[var(--border)] space-y-4"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              {t("Nav.jobAlerts", "Job alerts")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {t("Jobs.searchPlaceholder", "Keywords")}
                </label>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
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
                    className="w-full ps-9 pe-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {t("Jobs.location", "Location")}
                </label>
                <div className="relative">
                  <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
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
                    className="w-full ps-9 pe-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {t("Jobs.jobType", "Job Type")}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm"
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
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {t("Jobs.minSalary", "Min Salary")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="number"
                    placeholder="0"
                    value={form.minSalary}
                    onChange={(e) =>
                      setForm({ ...form, minSalary: e.target.value })
                    }
                    className="w-full ps-9 pe-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer hover:bg-[var(--surface-3)] transition-all w-fit">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) =>
                  setForm({ ...form, remote: e.target.checked })
                }
                className="w-4 h-4 rounded border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--brand-accent)]"
              />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-body)]">
                  {t("Jobs.remoteOnly", "Remote only")}
                </span>
              </div>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] disabled:opacity-50 text-[var(--text-on-brand)] text-sm font-medium transition-all"
              >
                {saving
                  ? t("Common.loading", "Saving...")
                  : t("Common.save", "Create Alert")}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] text-sm font-medium transition-all"
              >
                {t("Common.cancel", "Cancel")}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-[var(--border)]">
              <Bell className="w-10 h-10 text-[var(--text-subtle)] mx-auto mb-3" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                {t("Common.noResults", "No alerts yet")}
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
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
                className="glass rounded-xl p-5 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-[var(--text-primary)]">
                      {alert.keywords || t("Jobs.title", "All jobs")}
                    </h3>
                    {alert.active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] text-[10px] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("Common.success", "Active")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
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
                  className="p-2 rounded-lg hover:bg-[var(--error-soft)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
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
