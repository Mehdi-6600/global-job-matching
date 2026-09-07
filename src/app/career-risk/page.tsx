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
import type { CareerRiskAnalysis, CareerRiskFormInput } from "@/types/career-risk";
import {
  CAREER_RISK_DISCLAIMER_EN,
  CAREER_RISK_DISCLAIMER_FA,
} from "@/types/career-risk";
import {
  clearCareerRiskDraft,
  loadCareerRiskDraft,
  saveCareerRiskDraft,
} from "@/lib/career-risk-draft";
import { trackEvent } from "@/lib/track";

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
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<CareerRiskAnalysis | null>(null);
  const [locked, setLocked] = useState(false);
  const [info, setInfo] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [restored, setRestored] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);

  function currentForm(): CareerRiskFormInput {
    return {
      jobTitle: jobTitle.trim(),
      skills,
      industry,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      country,
      location,
      education,
    };
  }

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    setInfo("");
    setAnalysis(null);
    setSharePath(null);
    trackEvent("career_risk_analysis_started");

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
          country,
          location,
          education,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        saveCareerRiskDraft(currentForm(), { autoSubmit: true });
        setShowAuthGate(true);
        trackEvent("career_risk_auth_gate_shown");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        trackEvent("career_risk_analysis_failed");
        setLoading(false);
        return;
      }

      const parsed = parseAnalysisPayload(data);
      if (!parsed || !parsed.summary) {
        setError("Unexpected response from server. Please try again.");
        trackEvent("career_risk_analysis_failed");
        setLoading(false);
        return;
      }

      setAnalysis(parsed);
      setLocked(Boolean(data.alternativesLocked));
      setInfo(typeof data.message === "string" ? data.message : "");
      if (typeof data.sharePath === "string") setSharePath(data.sharePath);
      clearCareerRiskDraft();
      trackEvent("career_risk_analysis_completed");
      trackEvent("career_risk_result_viewed");
    } catch {
      setError("Network error. Please try again.");
      trackEvent("career_risk_analysis_failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    jobTitle,
    skills,
    industry,
    experienceYears,
    country,
    location,
    education,
  ]);

  useEffect(() => {
    trackEvent("career_risk_started");
  }, []);

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
    setCountry(draft.form.country || "");
    setLocation(draft.form.location || "");
    setEducation(draft.form.education || "");
    setRestored(true);
  }, [restored]);

  useEffect(() => {
    if (status === "authenticated") {
      trackEvent("career_risk_auth_success");
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!restored) return;
    const draft = loadCareerRiskDraft();
    if (
      draft?.autoSubmit &&
      (draft.form.jobTitle || jobTitle).trim().length >= 2
    ) {
      saveCareerRiskDraft(
        {
          jobTitle: jobTitle || draft.form.jobTitle,
          skills: skills || draft.form.skills,
          industry: industry || draft.form.industry,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : draft.form.experienceYears,
          country: country || draft.form.country,
          location: location || draft.form.location,
          education: education || draft.form.education,
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

    trackEvent("career_risk_form_completed");

    if (status !== "authenticated") {
      saveCareerRiskDraft(currentForm(), { autoSubmit: true });
      setShowAuthGate(true);
      trackEvent("career_risk_auth_gate_shown");
      return;
    }

    await runAnalysis();
  }

  function continueWithGoogle() {
    saveCareerRiskDraft(currentForm(), { autoSubmit: true });
    trackEvent("career_risk_google_login");
    void signIn("google", { callbackUrl: "/career-risk" });
  }

  function continueWithEmail() {
    saveCareerRiskDraft(currentForm(), { autoSubmit: true });
    trackEvent("career_risk_email_login");
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
                placeholder="e.g. Finance, Software"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={120}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Skills
            </label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Excel, Python, customer service"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 min-h-[88px]"
              maxLength={1500}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Country
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Germany"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Location / city
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Berlin"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Education
            </label>
            <input
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. BSc Computer Science"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              maxLength={200}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm py-3 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Check my risk
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            {CAREER_RISK_DISCLAIMER_EN}
          </p>
          <p className="text-[11px] text-slate-500 text-center" dir="rtl">
            {CAREER_RISK_DISCLAIMER_FA}
          </p>
        </form>

        {analysis && (
          <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Role</p>
                <p className="text-xl font-semibold text-white">
                  {analysis.jobTitle}
                </p>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 text-center ${levelColor[analysis.riskLevel]}`}
              >
                <p className="text-2xl font-bold">{analysis.riskScore}</p>
                <p className="text-xs uppercase tracking-wide">
                  {analysis.riskLevel}
                </p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>

            {analysis.reasons.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">
                  Why this score
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                  {analysis.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.skillsToBuild.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">
                  Skills to build
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                  {analysis.skillsToBuild.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-white mb-2">
                Alternative paths
              </h2>
              {locked || analysis.alternatives.length === 0 ? (
                <div className="flex items-start gap-2 text-slate-400 text-sm">
                  <Lock className="w-4 h-4 mt-0.5" />
                  <span>
                    {info ||
                      "Upgrade to Pro to unlock alternative role recommendations."}{" "}
                    <Link href="/pricing" className="text-cyan-400 underline">
                      View pricing
                    </Link>
                  </span>
                </div>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/jobs"
                onClick={() => trackEvent("career_risk_cta_clicked")}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm px-4 py-2"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Browse matching jobs
              </Link>
              {sharePath && (
                <button
                  type="button"
                  className="text-sm text-cyan-400 underline"
                  onClick={() => {
                    trackEvent("career_risk_share_created");
                    void navigator.clipboard?.writeText(
                      `${window.location.origin}${sharePath}`
                    );
                  }}
                >
                  Copy share link
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showAuthGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl relative">
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
              برای مشاهده نتیجه، ابتدا وارد حساب کاربری خود شوید
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Sign in to run the AI analysis, save the report, and unlock
              matches. Your answers stay on this device until you finish.
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
                  saveCareerRiskDraft(currentForm(), { autoSubmit: true })
                }
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
