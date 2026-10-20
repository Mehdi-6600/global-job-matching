"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  Loader2,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Interview {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  notes: string | null;
  meetLink: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    title: string | null;
  };
  job: {
    id: string;
    title: string;
    company: { name: string };
  };
}

export default function EmployerInterviewsPage() {
  const { t, locale } = useLocale();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    jobId: "",
    userId: "",
    scheduledAt: "",
    duration: "30",
    type: "video",
    meetLink: "",
    notes: "",
  });

  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: {
      label: t("Common.loading", "Scheduled"),
      color: "text-[var(--warning)] bg-[var(--warning-soft)]",
    },
    completed: {
      label: t("Common.success", "Completed"),
      color: "text-[var(--success)] bg-[var(--success-soft)]",
    },
    cancelled: {
      label: t("Common.cancel", "Cancelled"),
      color: "text-[var(--error)] bg-[var(--error-soft)]",
    },
  };

  useEffect(() => {
    void fetchInterviews();
  }, []);

  async function fetchInterviews() {
    const res = await fetch("/api/employer/interviews");
    if (res.ok) {
      const data = await res.json();
      setInterviews(data.interviews || []);
    }
    setLoading(false);
  }

  async function createInterview(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/employer/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        duration: parseInt(form.duration, 10),
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        jobId: "",
        userId: "",
        scheduledAt: "",
        duration: "30",
        type: "video",
        meetLink: "",
        notes: "",
      });
      await fetchInterviews();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/employer/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchInterviews();
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-2xl p-6 mb-6 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-7 h-7 text-[var(--brand-accent)]" />
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {t("Nav.dashboard", "Interviews")}
                </h1>
                <p className="text-[var(--text-muted)] text-sm">
                  {t(
                    "Employer.title",
                    "Schedule and manage candidate interviews"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                {t("Common.submit", "Schedule New")}
              </button>
              <Link
                href="/employer/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("Employer.title", "Dashboard")}
              </Link>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={createInterview}
            className="glass rounded-2xl p-6 mb-6 border border-[var(--border)] space-y-4"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              {t("Common.submit", "New Interview")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Job ID
                </label>
                <input
                  required
                  value={form.jobId}
                  onChange={(e) =>
                    setForm({ ...form, jobId: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Candidate User ID
                </label>
                <input
                  required
                  value={form.userId}
                  onChange={(e) =>
                    setForm({ ...form, userId: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  <Clock className="w-3 h-3 inline me-1" />
                  {t("Common.loading", "Date & time")}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm({ ...form, scheduledAt: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                >
                  <option value="video">Video</option>
                  <option value="phone">Phone</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Meet link
                </label>
                <input
                  type="url"
                  value={form.meetLink}
                  onChange={(e) =>
                    setForm({ ...form, meetLink: e.target.value })
                  }
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                rows={2}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--brand-accent)] text-[var(--text-on-brand)] text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("Common.submit", "Save")}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-body)] text-sm"
              >
                {t("Common.cancel", "Cancel")}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-[var(--border)]">
              <Calendar className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)]">
                {t("Common.noResults", "No interviews scheduled")}
              </p>
            </div>
          ) : (
            interviews.map((iv) => {
              const st =
                statusConfig[iv.status] || statusConfig.scheduled;
              return (
                <div
                  key={iv.id}
                  className="glass rounded-2xl p-5 border border-[var(--border)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand-accent-soft)] flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[var(--brand-accent)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[var(--text-primary)] font-medium">
                            {iv.user.name || iv.user.email}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm truncate">
                          {iv.job.title} · {iv.job.company?.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(iv.scheduledAt).toLocaleString(locale)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" /> {iv.duration} min
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--surface-2)]">
                            {iv.type}
                          </span>
                        </div>
                        {iv.notes && (
                          <p className="text-[var(--text-muted)] text-xs mt-2 italic">
                            {iv.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.meetLink && (
                        <a
                          href={iv.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] text-xs font-medium hover:bg-[var(--brand-accent-soft)] transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t("Common.view", "Join")}
                        </a>
                      )}
                      <Link
                        href={`/messages?with=${iv.user.id}`}
                        className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>
                      {iv.status === "scheduled" && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateStatus(iv.id, "completed")}
                            className="p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)] transition-all"
                            title={t("Common.success", "Mark completed")}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(iv.id, "cancelled")}
                            className="p-2 rounded-lg bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error-soft)] transition-all"
                            title={t("Common.cancel", "Cancel")}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
