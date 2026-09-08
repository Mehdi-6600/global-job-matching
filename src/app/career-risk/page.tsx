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
  clearCareerRiskDraft,
  loadCareerRiskDraft,
  saveCareerRiskDraft,
} from "@/lib/career-risk-draft";
import { trackEvent } from "@/lib/track";
import { useLocale } from "@/components/locale-provider";

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
  const { t, locale } = useLocale();
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
  const [paid, setPaid] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  const currentForm = useCallback((): CareerRiskFormInput => {
    const years = experienceYears.trim()
      ? Number(experienceYears)
      : undefined;
    return {
      jobTitle: jobTitle.trim(),
      skills: skills.trim() || undefined,
      industry: industry.trim() || undefined,
      experienceYears:
        years !== undefined && Number.isFinite(years) ? years : undefined,
      country: country.trim() || undefined,
      location: location.trim() || undefined,
      education: education.trim() || undefined,
    };
  }, [
    jobTitle,
    skills,
    industry,
    experienceYears,
    country,
    location,
    education,
  ]);

  const runAnalysis = useCallback(async () => {
    setError("");
    setLoading(true);
    setAnalysis(null);
    setSharePath(null);
    setUpgradeMessage(null);
    trackEvent("career_risk_submit");

    try {
      const res = await fetch("/api/career/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(currentForm()),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setShowAuthGate(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(
          (data as { error?: string }).error ||
            t("CareerRisk.failed", "Failed to analyze career risk")
        );
        setLoading(false);
        return;
      }

      const parsed = parseAnalysisPayload(data);
      if (!parsed) {
        setError(t("Common.error", "Something went wrong"));
        setLoading(false);
        return;
      }

      setAnalysis(parsed);
      setPaid(Boolean((data as { paid?: boolean }).paid));
      const path = (data as { sharePath?: string }).sharePath;
      if (path) setSharePath(path);
      const msg = (data as { message?: string }).message;
      if (msg) setUpgradeMessage(msg);
      clearCareerRiskDraft();
      trackEvent("career_risk_success");
    } catch {
      setError(t("Auth.errors.network", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [currentForm, t]);

  useEffect(() => {
    const draft = loadCareerRiskDraft();
    if (!draft) return;
    setJobTitle(draft.jobTitle || "");
    setSkills(draft.skills || "");
    setIndustry(draft.industry || "");
    setExperienceYears(
      draft.experienceYears != null ? String(draft.experienceYears) : ""
    );
    setCountry(draft.country || "");
    setLocation(draft.location || "");
    setEducation(draft.education || "");

    if (draft.autoSubmit && status === "authenticated") {
      clearCareerRiskDraft();
      void runAnalysis();
    }
  }, [status, runAnalysis]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jobTitle.trim().length < 2) {
      setError(
        t(
          "CareerRisk.needTitle",
          "Please enter a job title (at least 2 characters)."
        )
      );
      return;
    }
    if (status !== "authenticated") {
      saveCareerRiskDraft(currentForm(), { autoSubmit: true });
      setShowAuthGate(true);
      return;
    }
    void runAnalysis();
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
          {t("Nav.home", "Home")}
        </Link>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {t("CareerRisk.title", "AI Career Risk")}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t(
                "CareerRisk.subtitle",
                "Estimate how automation may affect your role over the next 5–10 years."
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 mb-8"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("CareerRisk.jobTitle", "Job title")} *
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t(
                "CareerRisk.jobTitlePh",
                "e.g. Accountant, Frontend Developer"
              )}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              maxLength={120}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.years", "Years of experience")}
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder={t("CareerRisk.yearsPh", "e.g. 5")}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.industry", "Industry")}
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t(
                  "CareerRisk.industryPh",
                  "e.g. Finance, Software"
                )}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={120}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("CareerRisk.skills", "Skills")}
            </label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={t(
                "CareerRisk.skillsPh",
                "e.g. Excel, Python, customer service"
              )}
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 resize-y"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.country", "Country")}
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t("CareerRisk.countryPh", "e.g. Germany")}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.location", "Location / city")}
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("CareerRisk.locationPh", "e.g. Berlin")}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={120}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("CareerRisk.education", "Education")}
            </label>
            <input
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={t(
                "CareerRisk.educationPh",
                "e.g. BSc Computer Science"
              )}
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
                {t("CareerRisk.analyzing", "Analyzing...")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("CareerRisk.submit", "Check my risk")}
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            {t(
              "CareerRisk.disclaimer",
              "This is an AI-powered estimate based on the information you provided. It is not a definitive prediction of your career future."
            )}
          </p>
        </form>

        {analysis && (
          <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">
                  {t("CareerRisk.jobTitle", "Job title")}
                </p>
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
                  {t("CareerRisk.why", "Why this score")}
                </h2>
                <ul className="space-y-2">
                  {analysis.reasons.map((r, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.skillsToBuild.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.skillsToBuild", "Skills to build")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {analysis.skillsToBuild.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-white mb-2">
                {t("CareerRisk.alternatives", "Alternative paths")}
              </h2>
              {paid && analysis.alternatives.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i} className="text-sm text-slate-300">
                      • {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">
                  {upgradeMessage ||
                    t(
                      "CareerRisk.upgradeAlts",
                      "Upgrade to Pro to unlock alternative role recommendations."
                    )}{" "}
                  <Link
                    href="/pricing"
                    className="text-cyan-400 hover:underline"
                  >
                    {t("CareerRisk.viewPricing", "View pricing")}
                  </Link>
                </p>
              )}
            </section>

            {sharePath && (
              <button
                type="button"
                className="text-xs text-cyan-400 hover:underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    `${window.location.origin}${sharePath}`
                  );
                }}
              >
                {t("Common.view", "View")} / share link
              </button>
            )}
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
              {t(
                "CareerRisk.authRequired",
                "Please sign in to run a career risk analysis."
              )}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {t(
                "CareerRisk.disclaimer",
                "This is an AI-powered estimate based on the information you provided."
              )}
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
                {t("Common.signIn", "Sign in")}
              </button>
              <Link
                href={`/register?callbackUrl=${encodeURIComponent("/career-risk")}`}
                className="block w-full text-center rounded-xl border border-white/10 text-slate-300 text-sm py-3"
                onClick={() =>
                  saveCareerRiskDraft(currentForm(), { autoSubmit: true })
                }
              >
                {t("Auth.submitRegister", "Create Account")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
