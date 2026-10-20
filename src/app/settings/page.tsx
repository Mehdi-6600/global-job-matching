"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  User,
  Mail,
  MapPin,
  Phone,
  Briefcase,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { PlanUsageCard } from "@/components/plan-usage-card";
import { PaymentHistoryCard } from "@/components/payment-history-card";
import { useLocale } from "@/components/locale-provider";
import { messageFromApiError } from "@/lib/api-error-i18n";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  resumeUrl: string | null;
}

function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

export default function SettingsPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    title: "",
    bio: "",
    location: "",
    phone: "",
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) {
            setUnauthorized(true);
            setLoading(false);
          }
          return null;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return null;
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
          setLoading(false);
          return null;
        }
        return data as {
          profile?: {
            id: string;
            email: string;
            name: string | null;
            title: string | null;
            bio: string | null;
            location: string | null;
            phone: string | null;
            avatar?: string | null;
            role: string;
            resumeUrl: string | null;
          };
        };
      })
      .then((data) => {
        if (cancelled || !data?.profile) return;
        setProfile({
          id: data.profile.id,
          email: data.profile.email,
          name: data.profile.name,
          title: data.profile.title,
          bio: data.profile.bio,
          location: data.profile.location,
          phone: data.profile.phone,
          avatar: data.profile.avatar ?? null,
          role: data.profile.role,
          resumeUrl: data.profile.resumeUrl,
        });
        setForm({
          name: data.profile.name || "",
          title: data.profile.title || "",
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          phone: data.profile.phone || "",
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            t(
              "Common.errorNetwork",
              "Network error. Please try again.",
            ),
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (unauthorized) {
      router.replace("/login?callbackUrl=/settings");
    }
  }, [unauthorized, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        setSaving(false);
        return;
      }

      if (data.profile) setProfile(data.profile);
      setSuccess(true);
      setSaving(false);
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResumeMessage("");
    setError("");
    setResumeUploading(true);

    const formEl = e.currentTarget;

    try {
      const formData = new FormData(formEl);
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        setResumeUploading(false);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resumeUrl:
                data.resumeUrl ||
                data.profile?.resumeUrl ||
                prev.resumeUrl,
            }
          : prev,
      );
      setResumeMessage(
        t("Settings.resumeUploaded", "Resume uploaded successfully."),
      );
      setResumeUploading(false);
      formEl.reset();
    } catch {
      setError(
        t(
          "Common.errorNetwork",
          "Network error. Please try again.",
        ),
      );
      setResumeUploading(false);
    }
  };

  const handleResumeDelete = async () => {
    const confirmed = window.confirm(
      t(
        "Settings.resumeDeleteConfirm",
        "Are you sure you want to remove your resume?",
      ),
    );
    if (!confirmed) return;
    setError("");
    setResumeMessage("");
    try {
      const res = await fetch("/api/profile/resume", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        return;
      }
      setProfile((prev) => (prev ? { ...prev, resumeUrl: null } : prev));
      setResumeMessage(
        t("Settings.resumeRemoved", "Resume removed."),
      );
    } catch {
      setError(
        t(
          "Common.errorNetwork",
          "Network error. Please try again.",
        ),
      );
    }
  };

  if (loading || unauthorized) {
    return (
      <div className="gjm-page flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin mx-auto" />
          {unauthorized && (
            <p className="text-[var(--text-muted)] text-sm mt-3">
              {t("Common.loading", "Loading...")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="gjm-page flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[var(--error)] mx-auto" />
          <p className="text-[var(--text-body)]">
            {error || t("Settings.notFound", "Profile not found")}
          </p>
          <Link
            href="/login"
            className="text-[var(--brand-primary)] hover:underline text-sm"
          >
            {t("Common.signIn", "Sign in")}
          </Link>
        </div>
      </div>
    );
  }

  const resumeIsUrl = isHttpUrl(profile.resumeUrl);

  return (
    <div className="gjm-page py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:text-[var(--text-primary)]"
            aria-label={t("Common.back", "Back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Settings className="w-6 h-6 text-[var(--brand-primary)]" />
              {t("Settings.title", "Settings")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              {t(
                "Settings.subtitle",
                "Manage your profile, plan, and resume",
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-[var(--success-soft)] border border-[var(--success)] text-[var(--success)] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t("Settings.saved", "Profile saved")}
          </div>
        )}
        {resumeMessage && (
          <div className="p-3 rounded-xl bg-[var(--brand-primary-soft)] border border-[var(--border)] text-[var(--brand-primary)] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {resumeMessage}
          </div>
        )}

        <PlanUsageCard />
        <PaymentHistoryCard />

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-6 sm:p-8 bg-[var(--surface-2)] border border-[var(--border)] space-y-5"
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--brand-primary)]" />
            {t("Settings.profile", "Profile")}
          </h2>

          <div>
            <label
              htmlFor="settings-email"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              <Mail className="w-3.5 h-3.5 inline me-1" />
              {t("Settings.email", "Email")}
            </label>
            <input
              id="settings-email"
              type="email"
              value={profile.email || ""}
              disabled
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-name"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              {t("Settings.name", "Name")}
            </label>
            <input
              id="settings-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="settings-title"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 inline me-1" />
              {t("Settings.headline", "Title / Skills headline")}
            </label>
            <input
              id="settings-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="settings-bio"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              {t("Settings.bio", "Bio")}
            </label>
            <textarea
              id="settings-bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none resize-y"
            />
          </div>

          <div>
            <label
              htmlFor="settings-location"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              <MapPin className="w-3.5 h-3.5 inline me-1" />
              {t("Settings.location", "Location")}
            </label>
            <input
              id="settings-location"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="settings-phone"
              className="block text-sm text-[var(--text-body)] mb-1.5"
            >
              <Phone className="w-3.5 h-3.5 inline me-1" />
              {t("Settings.phone", "Phone")}
            </label>
            <input
              id="settings-phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[image:var(--gradient-brand)] text-[var(--text-primary)] py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Settings.saving", "Saving...")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("Settings.saveProfile", "Save profile")}
              </>
            )}
          </button>
        </form>

        <section className="rounded-3xl p-6 sm:p-8 bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
            {t("Settings.resume", "Resume")}
          </h2>

          {profile.resumeUrl ? (
            <div className="flex flex-wrap items-center gap-3">
              {resumeIsUrl ? (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--brand-primary)] text-sm hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("Settings.viewResume", "View current resume")}
                </a>
              ) : (
                <span className="text-sm text-[var(--text-body)]">
                  {profile.resumeUrl}
                </span>
              )}
              <button
                type="button"
                onClick={handleResumeDelete}
                className="p-2 rounded-lg bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error-soft)]"
                title={t("Settings.removeResume", "Remove resume")}
                aria-label={t("Settings.removeResume", "Remove resume")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleResumeUpload} className="space-y-4">
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--brand-primary)] transition-all">
                <input
                  type="file"
                  name="resume"
                  accept=".pdf,application/pdf"
                  required
                  aria-label={t("Settings.uploadResume", "Upload resume")}
                  className="block w-full text-sm text-[var(--text-muted)] file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--brand-primary-soft)] file:text-[var(--brand-primary)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  {t("Settings.pdfOnly", "PDF only · max 5MB")}
                </p>
              </div>
              <button
                type="submit"
                disabled={resumeUploading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-60"
              >
                {resumeUploading
                  ? t("Settings.uploading", "Uploading...")
                  : t("Settings.uploadResume", "Upload resume")}
              </button>
            </form>
          )}

          {profile.resumeUrl && (
            <form onSubmit={handleResumeUpload} className="pt-2">
              <label
                htmlFor="settings-replace-resume"
                className="block text-xs text-[var(--text-muted)] mb-2"
              >
                {t("Settings.replacePdf", "Replace with a new PDF")}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="settings-replace-resume"
                  type="file"
                  name="resume"
                  accept=".pdf,application/pdf"
                  required
                  className="flex-1 text-sm text-[var(--text-muted)] file:me-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--brand-primary-soft)] file:text-[var(--brand-primary)]"
                />
                <button
                  type="submit"
                  disabled={resumeUploading}
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary-hover)] text-sm font-medium hover:bg-[var(--brand-primary-soft)] disabled:opacity-60"
                >
                  {resumeUploading
                    ? t("Settings.uploading", "Uploading...")
                    : t("Settings.replace", "Replace")}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
