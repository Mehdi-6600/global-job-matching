"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import type { CareerRiskAnalysis } from "@/types/career-risk";
import {
  CAREER_RISK_DISCLAIMER_EN,
  CAREER_RISK_DISCLAIMER_FA,
} from "@/types/career-risk";
import {
  clearCareerRiskDraft,
  loadCareerRiskDraft,
  saveCareerRiskDraft,
} from "@/lib/career-risk-draft";

const levelColor = {
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  high: "text-red-400 border-red-500/30 bg-red-500/10",
};

function parseAnalysisPayload(data: unknown): CareerRiskAnalysis | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const nested = d.analysis;
  const src =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : d;
  if (typeof src.riskScore !== "number" && typeof src.riskScore !== "string") {
    return null;
  }
  const score = Math.max(0, Math.min(100, Math.round(Number(src.riskScore))));
  const levelRaw = String(src.riskLevel || "").toLowerCase();
  const riskLevel =
    levelRaw === "low" || levelRaw === "medium" || levelRaw === "high"
      ? levelRaw
      : score < 35
        ? "low"
        : score < 65
          ? "medium"
          : "high";
  return {
    jobTitle: String(src.jobTitle || ""),
    riskScore: score,
    riskLevel,
    summary: String(src.summary || ""),
    reasons: Array.isArray(src.reasons)
      ? src.reasons.map((x) => String(x))
      : [],
    skillsToBuild: Array.isArray(src.skillsToBuild)
      ? src.skillsToBuild.map((x) => String(x))
      : [],
    alternatives: Array.isArray(src.alternatives)
      ? src.alternatives.map((x) => String(x))
      : [],
    source: src.source === "heuristic" ? "heuristic" : "ai",
  };
}

export default function CareerRiskPage() {
  const { data: session, status } = useSession();
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<CareerRiskAnalysis | null>(null);
  const [locked, setLocked] = useState(false);
  const [info, setInfo] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [restored, setRestored] = useState(false);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    setInfo("");
    setAnalysis(null);

    try {
      const res = await fetch("/api/career/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          skills,
          industry,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        saveCareerRiskDraft(
          {
            jobTitle: jobTitle.trim(),
            skills,
            industry,
            experienceYears: experienceYears
              ? Number(experienceYears)
              : undefined,
          },
          { autoSubmit: true }
        );
        setShowAuthGate(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      const parsed = parseAnalysisPayload(data);
      if (!parsed || !parsed.summary) {
        setError("Unexpected response from server. Please try again.");
        setLoading(false);
        return;
      }

      setAnalysis(parsed);
      setLocked(Boolean(data.alternativesLocked));
      setInfo(typeof data.message === "string" ? data.message : "");
      clearCareerRiskDraft();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [jobTitle, skills, industry, experienceYears]);

  // Restore draft after login / return
  useEffect(() => {
    if (restored) return;
    const draft = loadCareerRiskDraft();
    if (!draft) {
      setRestored(true);
      return;
    }
    setJobTitle(draft.form.jobTitle || "");
    setSkills(draft.form.skills || "");
    setIndustry(draft.form.industry || "");
    setExperienceYears(
      draft.form.experienceYears != null
        ? String(draft.form.experienceYears)
        : ""
    );
    setRestored(true);
  }, [restored]);

  // After session becomes authenticated, auto-run if draft requested it
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!restored) return;
    const draft = loadCareerRiskDraft();
    if (draft?.autoSubmit && (draft.form.jobTitle || jobTitle).trim().length >= 2) {
      // clear autoSubmit flag so we don't loop
      saveCareerRiskDraft(
        {
          jobTitle: jobTitle || draft.form.jobTitle,
          skills: skills || draft.form.skills,
          industry: industry || draft.form.industry,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : draft.form.experienceYears,
        },
        { autoSubmit: false }
      );
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, restored]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jobTitle.trim().length < 2) {
      setError("Please enter a job title (at least 2 characters).");
      return;
    }

    // Gate before calling AI if logged out
    if (status !== "authenticated") {
      saveCareerRiskDraft(
        {
          jobTitle: jobTitle.trim(),
          skills,
          industry,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : undefined,
        },
        { autoSubmit: true }
      );
      setShowAuthGate(true);
      return;
    }

    await runAnalysis();
  }

  function continueWithGoogle() {
    saveCareerRiskDraft(
      {
        jobTitle: jobTitle.trim(),
        skills,
        industry,
        experienceYears: experienceYears
          ? Number(experienceYears)
          : undefined,
      },
      { autoSubmit: true }
    );
    void signIn("google", { callbackUrl: "/career-risk" });
  }

  function continueWithEmail() {
    saveCareerRiskDraft(
      {
        jobTitle: jobTitle.trim(),
        skills,
        industry,
        experienceYears: experienceYears
          ? Number(experienceYears)
          : undefined,
      },
      { autoSubmit: true }
    );
    window.location.href = `/login?callbackUrl=${encodeURIComponent("/career-risk")}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              AI Career Risk
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Is your role exposed to AI and automation? Get a clear score and a
              practical upskilling plan.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 mb-8"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Job title *
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Accountant, Frontend Developer"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              maxLength={120}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Years of experience
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Industry
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Finance, Healthcare"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={120}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Skills (comma-separated)
            </label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Excel, Python, customer service"
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 resize-y"
              maxLength={1500}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || status === "loading"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm py-3 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Check my career risk
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 leading-relaxed text-center">
            {CAREER_RISK_DISCLAIMER_EN}
            <br />
            <span dir="rtl" className="inline-block mt-1">
              {CAREER_RISK_DISCLAIMER_FA}
            </span>
          </p>
        </form>

        {analysis && (
          <div className="space-y-4">
            <div
              className={`glass rounded-2xl p-5 border ${levelColor[analysis.riskLevel]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    Risk score
                  </p>
                  <p className="text-3xl font-bold">{analysis.riskScore}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold border border-current/30">
                  {analysis.riskLevel.toUpperCase()} RISK
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/20 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-current/80 transition-all"
                  style={{ width: `${analysis.riskScore}%` }}
                />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {analysis.summary}
              </p>
              {info && (
                <p className="mt-3 text-xs text-amber-300/90 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {info}
                </p>
              )}
              <p className="mt-3 text-[11px] text-slate-500">
                Source: {analysis.source === "ai" ? "AI model" : "Heuristic fallback"}{" "}
                · {CAREER_RISK_DISCLAIMER_EN}
              </p>
            </div>

            {analysis.reasons.length > 0 && (
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h2 className="text-white font-semibold text-sm mb-3">
                  Why this score
                </h2>
                <ul className="space-y-2">
                  {analysis.reasons.map((r, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.skillsToBuild.length > 0 && (
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h2 className="text-white font-semibold text-sm mb-3">
                  Skills to build
                </h2>
                <div className="flex flex-wrap gap-2">
                  {analysis.skillsToBuild.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="glass rounded-2xl p-5 border border-white/10">
              <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                Alternative careers
                {locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
              </h2>
              {locked ? (
                <div className="text-center py-6">
                  <Lock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm mb-4">
                    Unlock personalized alternative roles with a paid plan.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex px-5 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-semibold"
                  >
                    View pricing
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-emerald-400">→</span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/jobs"
                className="flex-1 text-center rounded-xl bg-sky-500 text-white text-sm font-semibold py-3"
              >
                Browse matching jobs
              </Link>
              <Link
                href="/resume-builder"
                className="flex-1 text-center rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold py-3"
              >
                Build AI resume
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Gate — no result until signed in */}
      {showAuthGate && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthGate(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Sign in to see your result
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your career risk assessment is ready to run. Sign in to view the
              full report, save it to your account, and unlock job matches.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={continueWithGoogle}
                className="w-full rounded-xl bg-white text-slate-900 font-semibold text-sm py-3 hover:bg-slate-100"
              >
                Continue with Google
              </button>
              <button
                type="button"
                onClick={continueWithEmail}
                className="w-full rounded-xl bg-cyan-500 text-white font-semibold text-sm py-3"
              >
                Continue with Email
              </button>
              <Link
                href={`/register?callbackUrl=${encodeURIComponent("/career-risk")}`}
                className="block w-full text-center rounded-xl border border-white/10 text-slate-300 text-sm py-3"
                onClick={() =>
                  saveCareerRiskDraft(
                    {
                      jobTitle: jobTitle.trim(),
                      skills,
                      industry,
                      experienceYears: experienceYears
                        ? Number(experienceYears)
                        : undefined,
                    },
                    { autoSubmit: true }
                  )
                }
              >
                Create account
              </Link>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 text-center">
              Your form answers stay on this device until you finish sign-in
              (session storage, expires in 2 hours).
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
