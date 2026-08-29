"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  Sparkles,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Printer,
} from "lucide-react";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
  tone: "professional" | "confident" | "concise";
  saveToProfile: boolean;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  targetRole: "",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  languages: "",
  tone: "professional",
  saveToProfile: true,
};

export default function ResumeBuilderPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [resume, setResume] = useState("");
  const [source, setSource] = useState<"ai" | "template" | "">("");
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/resume-builder";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const p = data.profile || data.user || {};
        setForm((prev) => ({
          ...prev,
          fullName: p.name || prev.fullName,
          email: p.email || prev.email,
          phone: p.phone || "",
          location: p.location || "",
          targetRole: p.title || p.headline || "",
          summary: p.bio || "",
          skills: p.skills || "",
          experience: p.experience || "",
          education: p.education || "",
        }));
        setPrefillLoading(false);
      })
      .catch(() => setPrefillLoading(false));
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setSuccess("");
    setError("");
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setCopied(false);

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        setLoading(false);
        return;
      }
      setResume(data.resume || "");
      setSource(data.source || "");
      setSuccess(data.message || "Resume ready");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!resume) return;
    try {
      await navigator.clipboard.writeText(resume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  function handlePrint() {
    if (!resume) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Resume</title>
      <style>
        body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; white-space: pre-wrap; line-height: 1.5; color: #111; }
      </style></head>
      <body>${resume.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  if (prefillLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Resume Builder</h1>
            <p className="text-slate-400 text-sm">
              Fill your details — generate a professional resume you can copy or
              print
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
            {source && (
              <span className="text-slate-500">({source})</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleGenerate}
            className="glass rounded-2xl p-6 border border-white/10 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                placeholder="Full name *"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
              <input
                name="targetRole"
                value={form.targetRole}
                onChange={handleChange}
                placeholder="Target role"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
            </div>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Location"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={3}
              placeholder="Short summary / career goal"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
            />
            <textarea
              name="skills"
              value={form.skills}
              onChange={handleChange}
              rows={2}
              placeholder="Skills (e.g. React, TypeScript, Project management)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
            />
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={5}
              placeholder="Experience (company, role, years, what you did)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
            />
            <textarea
              name="education"
              value={form.education}
              onChange={handleChange}
              rows={2}
              placeholder="Education"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
            />
            <input
              name="languages"
              value={form.languages}
              onChange={handleChange}
              placeholder="Languages"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select
                name="tone"
                value={form.tone}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              >
                <option value="professional">Professional</option>
                <option value="confident">Confident</option>
                <option value="concise">Concise</option>
              </select>
              <label className="flex items-center gap-2 text-slate-300 text-sm">
                <input
                  type="checkbox"
                  name="saveToProfile"
                  checked={form.saveToProfile}
                  onChange={handleChange}
                />
                Save notes to profile
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Resume
                </>
              )}
            </button>
          </form>

          <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-white font-semibold text-sm">Preview</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!resume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs disabled:opacity-40"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!resume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>
            {resume ? (
              <pre className="flex-1 whitespace-pre-wrap text-slate-200 text-sm leading-relaxed overflow-auto font-sans">
                {resume}
              </pre>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center px-4">
                Your generated resume will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
