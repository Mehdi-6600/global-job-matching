"use client";

import { useState, useEffect } from "react";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setForm({
            name: data.profile.name || "",
            title: data.profile.title || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
            phone: data.profile.phone || "",
          });
        } else {
          setError(data.error || "Failed to load profile");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess(false);
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      setProfile(data.profile);
      setSuccess(true);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResumeMessage("");
    setError("");
    setResumeUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/profile/resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            (data.code === "STORAGE_NOT_CONFIGURED"
              ? "Cloud storage is not configured on the server."
              : "Upload failed")
        );
        setResumeUploading(false);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resumeUrl: data.resumeUrl || null,
            }
          : prev
      );
      setResumeMessage(data.message || "Resume uploaded");
      e.currentTarget.reset();
    } catch {
      setError("Network error while uploading resume");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!confirm("Remove your resume?")) return;
    setError("");
    setResumeMessage("");

    try {
      const res = await fetch("/api/profile/resume", { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, resumeUrl: null } : prev));
        setResumeMessage("Resume removed");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to remove resume");
      }
    } catch {
      setError("Network error");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-slate-300">{error || "Profile not found"}</p>
          <Link href="/login" className="text-cyan-400 hover:underline text-sm">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const resumeIsUrl = isHttpUrl(profile.resumeUrl);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-cyan-400" />
              Settings
            </h1>
            <p className="text-slate-400 text-sm">Manage your profile and resume</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile saved
          </div>
        )}
        {resumeMessage && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {resumeMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-6 sm:p-8 bg-white/5 border border-white/10 space-y-5"
        >
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Profile
          </h2>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={profile.email || ""}
              disabled
              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Title / Skills headline
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Bio</label>
            <textarea
              name="bio"
              rows={4}
              value={form.bio}
              onChange={handleChange}
              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-y"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                Location
              </label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-400 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save profile
              </>
            )}
          </button>
        </form>

        <section className="rounded-3xl p-6 sm:p-8 bg-white/5 border border-white/10 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Resume (PDF)
          </h2>

          {profile.resumeUrl ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <FileText className="w-8 h-8 text-cyan-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {resumeIsUrl ? "Uploaded resume (PDF)" : profile.resumeUrl}
                </p>
                <p className="text-slate-500 text-xs">
                  {resumeIsUrl
                    ? "Stored in cloud storage"
                    : "Legacy filename only — re-upload to store the real PDF"}
                </p>
              </div>
              {resumeIsUrl && (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                  title="Open"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={handleResumeDelete}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleResumeUpload} className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-cyan-500/30 transition-all">
                <input
                  type="file"
                  name="resume"
                  accept=".pdf,application/pdf"
                  required
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300"
                />
                <p className="text-xs text-slate-500 mt-3">PDF only · max 5MB</p>
              </div>
              <button
                type="submit"
                disabled={resumeUploading}
                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 disabled:opacity-60"
              >
                {resumeUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload resume"
                )}
              </button>
            </form>
          )}

          {profile.resumeUrl && (
            <form onSubmit={handleResumeUpload} className="pt-2">
              <label className="block text-xs text-slate-400 mb-2">
                Replace with a new PDF
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="file"
                  name="resume"
                  accept=".pdf,application/pdf"
                  required
                  className="flex-1 text-sm text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300"
                />
                <button
                  type="submit"
                  disabled={resumeUploading}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-60"
                >
                  {resumeUploading ? "Uploading..." : "Replace"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
