"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  History,
  Copy,
  Map,
  Plane,
} from "lucide-react";
import type {
  CareerRiskAnalysis,
  CareerRiskFormInput,
  CareerRiskSubScores,
} from "@/types/career-risk";
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

type HistoryItem = {
  id: string;
  jobTitle: string;
  riskScore: number;
  riskLevel: string;
  summary: string;
  sharePath?: string;
  createdAt: string;
};

type RoadmapWeek = {
  week: string;
  focus: string;
  actions: string[];
};

type RoadmapResult = {
  title: string;
  weeks: RoadmapWeek[];
  resources: string[];
  source: "ai" | "heuristic";
};

type MigrationCountry = {
  country: string;
  demand: string;
  pathway: string;
  notes: string;
};

type MigrationResult = {
  title: string;
  summary: string;
  countries: MigrationCountry[];
  caveats: string[];
  source: "ai" | "heuristic";
};

function parseSubScores(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown) =>
    Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  return {
    taskAutomation: n(o.taskAutomation),
    toolMaturity: n(o.toolMaturity),
    marketAdoption: n(o.marketAdoption),
    agenticExposure: n(o.agenticExposure),
  };
}

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
    subScores: parseSubScores(src.subScores),
    timeHorizon: src.timeHorizon ? String(src.timeHorizon) : undefined,
    confidence:
      src.confidence != null
        ? Math.max(0, Math.min(100, Math.round(Number(src.confidence))))
        : undefined,
    industryOutlook: src.industryOutlook
      ? String(src.industryOutlook)
      : undefined,
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-slate-200 font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 to-cyan-400"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function CareerRiskPage() {
  const { t } = useLocale();
  const { status } = useSession();
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const [migration, setMigration] = useState<MigrationResult | null>(null);

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

  const levelLabel = useCallback(
    (level: string) => {
      const l = String(level || "").toLowerCase();
      if (l === "low") return t("CareerRisk.levelLow", "LOW");
      if (l === "medium") return t("CareerRisk.levelMedium", "MEDIUM");
      if (l === "high") return t("CareerRisk.levelHigh", "HIGH");
      return level;
    },
    [t]
  );

  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/career/risk", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.assessments) ? data.assessments : [];
      setHistory(
        items.map(
          (a: {
            id: string;
            jobTitle: string;
            riskScore: number;
            riskLevel: string;
            summary: string;
            sharePath?: string;
            createdAt: string;
          }) => ({
            id: a.id,
            jobTitle: a.jobTitle,
            riskScore: a.riskScore,
            riskLevel: a.riskLevel,
            summary: a.summary,
            sharePath: a.sharePath,
            createdAt: a.createdAt,
          })
        )
      );
    } catch {
      // ignore
    }
  }, [status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const runAnalysis = useCallback(async () => {
    setError("");
    setLoading(true);
    setAnalysis(null);
    setSharePath(null);
    setUpgradeMessage(null);
    setRoadmap(null);
    setRoadmapError("");
    setMigration(null);
    setMigrationError("");
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
      void loadHistory();
    } catch {
      setError(t("Auth.errors.network", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [currentForm, t, loadHistory]);

  useEffect(() => {
    const draft = loadCareerRiskDraft();
    if (!draft?.form) return;
    const f = draft.form;
    setJobTitle(f.jobTitle || "");
    setSkills(f.skills || "");
    setIndustry(f.industry || "");
    setExperienceYears(
      f.experienceYears != null ? String(f.experienceYears) : ""
    );
    setCountry(f.country || "");
    setLocation(f.location || "");
    setEducation(f.education || "");

    if (draft.autoSubmit && status === "authenticated") {
      clearCareerRiskDraft();
      void runAnalysis();
    }
  }, [status, runAnalysis]);

  const generateRoadmap = useCallback(async () => {
    if (!analysis) return;
    setRoadmapError("");
    setRoadmapLoading(true);
    trackEvent("career_roadmap_submit");
    try {
      const res = await fetch("/api/career/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...currentForm(),
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          skillsToBuild: analysis.skillsToBuild,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setShowAuthGate(true);
        setRoadmapLoading(false);
        return;
      }
      if (!res.ok) {
        setRoadmapError(
          (data as { error?: string }).error ||
            t("CareerRisk.roadmapFailed", "Failed to build roadmap")
        );
        setRoadmapLoading(false);
        return;
      }
      const rawWeeks = Array.isArray((data as { weeks?: unknown }).weeks)
        ? ((data as { weeks: unknown[] }).weeks as Record<string, unknown>[])
        : [];
      const weeks: RoadmapWeek[] = rawWeeks.map((w) => {
        const week = String(w.week || w.range || "");
        const focus = String(w.focus || "");
        const actionsRaw = w.actions ?? w.tasks;
        const actions = Array.isArray(actionsRaw)
          ? actionsRaw.map((x) => String(x))
          : [];
        return { week, focus, actions };
      });
      setRoadmap({
        title: String(
          (data as { title?: string }).title ||
            t("CareerRisk.roadmapCta", "Build 90-day skill roadmap")
        ),
        weeks,
        resources: Array.isArray((data as { resources?: unknown }).resources)
          ? ((data as { resources: unknown[] }).resources as unknown[]).map(
              (x) => String(x)
            )
          : [],
        source:
          (data as { source?: string }).source === "heuristic"
            ? "heuristic"
            : "ai",
      });
      trackEvent("career_roadmap_success");
    } catch {
      setRoadmapError(
        t("Auth.errors.network", "Network error. Please try again.")
      );
    } finally {
      setRoadmapLoading(false);
    }
  }, [analysis, currentForm, t]);

  const generateMigration = useCallback(async () => {
    if (!analysis) return;
    setMigrationError("");
    setMigrationLoading(true);
    trackEvent("career_migration_submit");
    try {
      const res = await fetch("/api/career/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...currentForm(),
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          skillsToBuild: analysis.skillsToBuild,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setShowAuthGate(true);
        setMigrationLoading(false);
        return;
      }
      if (!res.ok) {
        setMigrationError(
          (data as { error?: string }).error ||
            t(
              "CareerRisk.migrationFailed",
              "Failed to analyze migration options"
            )
        );
        setMigrationLoading(false);
        return;
      }
      const countries = (
        Array.isArray((data as { countries?: unknown }).countries)
          ? (data as { countries: MigrationCountry[] }).countries || []
          : []
      ).map((c) => ({
        country: String(c.country || ""),
        demand: String(c.demand || ""),
        pathway: String(c.pathway || ""),
        notes: String(c.notes || ""),
      }));
      setMigration({
        title: String((data as { title?: string }).title || ""),
        summary: String((data as { summary?: string }).summary || ""),
        countries,
        caveats: Array.isArray((data as { caveats?: unknown }).caveats)
          ? ((data as { caveats: unknown[] }).caveats as unknown[]).map((x) =>
              String(x)
            )
          : [],
        source:
          (data as { source?: string }).source === "heuristic"
            ? "heuristic"
            : "ai",
      });
      trackEvent("career_migration_success");
    } catch {
      setMigrationError(
        t("Auth.errors.network", "Network error. Please try again.")
      );
    } finally {
      setMigrationLoading(false);
    }
  }, [analysis, currentForm, t]);

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

  async function copyShare() {
    if (!sharePath) return;
    try {
      await navigator.clipboard?.writeText(
        `${window.location.origin}${sharePath}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const sourceLabel = useMemo(() => {
    if (!analysis) return "";
    return analysis.source === "heuristic"
      ? t("CareerRisk.offlineModel", "Offline model")
      : t("CareerRisk.onlineModel", "Online AI");
  }, [analysis, t]);

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
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("CareerRisk.skills", "Skills")}
            </label>
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={t(
                "CareerRisk.skillsPh",
                "e.g. Excel, Python, customer service"
              )}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
              maxLength={300}
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
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.location", "City / location")}
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("CareerRisk.locationPh", "e.g. Berlin")}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50"
                maxLength={80}
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

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm py-3.5 disabled:opacity-60 shadow-lg shadow-cyan-500/30 border border-cyan-300/30"
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

            <p className="text-[11px] text-slate-400 text-center leading-relaxed px-1">
              {t(
                "CareerRisk.stepsAfterRisk",
                "The steps below unlock after you run a risk analysis."
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void generateRoadmap()}
                disabled={!analysis || roadmapLoading}
                className={
                  analysis
                    ? "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm py-3.5 disabled:opacity-60 shadow-lg shadow-orange-500/40 border border-orange-300/40"
                    : "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-700/80 text-slate-400 font-semibold text-sm py-3.5 cursor-not-allowed border border-white/5 shadow-none"
                }
              >
                {roadmapLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t(
                      "CareerRisk.roadmapLoading",
                      "Building 90-day roadmap..."
                    )}
                  </>
                ) : (
                  <>
                    <Map className="w-4 h-4" />
                    {t("CareerRisk.roadmapCta", "Build 90-day skill roadmap")}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => void generateMigration()}
                disabled={!analysis || migrationLoading}
                className={
                  analysis
                    ? "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm py-3.5 disabled:opacity-60 shadow-xl shadow-red-900/50 border border-red-500/40"
                    : "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-700/80 text-slate-400 font-semibold text-sm py-3.5 cursor-not-allowed border border-white/5 shadow-none"
                }
              >
                {migrationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t(
                      "CareerRisk.migrationLoading",
                      "Analyzing migration options..."
                    )}
                  </>
                ) : (
                  <>
                    <Plane className="w-4 h-4" />
                    {t(
                      "CareerRisk.migrationCta",
                      "Where can I migrate with these skills?"
                    )}
                  </>
                )}
              </button>
            </div>

            {analysis ? (
              <p className="text-[11px] text-slate-500 text-center">
                {t(
                  "CareerRisk.migrationDisclaimer",
                  "General orientation only — not legal or immigration advice. Laws change; verify with official sources."
                )}
              </p>
            ) : null}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            {t(
              "CareerRisk.disclaimer",
              "This is an AI-powered estimate based on the information you provided. It is not a definitive prediction of your career future."
            )}
          </p>
        </form>

        {analysis && (
          <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10 space-y-5 mb-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">
                  {t("CareerRisk.jobTitle", "Job title")}
                </p>
                <p className="text-xl font-semibold text-white">
                  {analysis.jobTitle}
                </p>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {analysis.timeHorizon ? (
                    <p>
                      {t("CareerRisk.horizon", "Horizon")}:{" "}
                      <span dir="ltr" className="inline-block">
                        {analysis.timeHorizon}
                      </span>
                    </p>
                  ) : null}
                  {analysis.confidence != null ? (
                    <p>
                      {t("CareerRisk.confidence", "Confidence")}:{" "}
                      <span dir="ltr" className="tabular-nums">
                        {analysis.confidence}%
                      </span>
                    </p>
                  ) : null}
                  <p>{sourceLabel}</p>
                </div>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 text-center min-w-[88px] ${levelColor[analysis.riskLevel]}`}
              >
                <p className="text-2xl font-bold tabular-nums" dir="ltr">
                  {analysis.riskScore}
                </p>
                <p className="text-xs tracking-wide">
                  {levelLabel(analysis.riskLevel)}
                </p>
              </div>
            </div>

            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  analysis.riskLevel === "high"
                    ? "bg-red-500/80"
                    : analysis.riskLevel === "medium"
                      ? "bg-amber-500/80"
                      : "bg-emerald-500/80"
                }`}
                style={{ width: `${analysis.riskScore}%` }}
              />
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {analysis.summary}
            </p>

            {analysis.subScores && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-white">
                  {t("CareerRisk.breakdown", "Risk breakdown")}
                </h2>
                <ScoreBar
                  label={t("CareerRisk.taskAutomation", "Task automation")}
                  value={analysis.subScores.taskAutomation}
                />
                <ScoreBar
                  label={t("CareerRisk.toolMaturity", "Tool maturity")}
                  value={analysis.subScores.toolMaturity}
                />
                <ScoreBar
                  label={t("CareerRisk.marketAdoption", "Market adoption")}
                  value={analysis.subScores.marketAdoption}
                />
                <ScoreBar
                  label={t("CareerRisk.agentExposure", "Agent exposure")}
                  value={analysis.subScores.agenticExposure}
                />
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-white mb-2">
                {t("CareerRisk.why", "Why this score")}
              </h2>
              <ul className="space-y-2">
                {analysis.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-slate-200 flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white mb-2">
                {t("CareerRisk.skillsToBuild", "Skills to build")}
              </h2>
              <ul className="space-y-2">
                {analysis.skillsToBuild.map((s, i) => (
                  <li key={i} className="text-sm text-slate-200">
                    • {s}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white mb-2">
                {t("CareerRisk.alternatives", "Alternative paths")}
              </h2>
              {paid && analysis.alternatives.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i} className="text-sm text-slate-200">
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

            {roadmapError && (
              <div className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{roadmapError}</span>
              </div>
            )}

            {roadmap && (
              <section className="space-y-4 border-t border-white/10 pt-5">
                <h2 className="text-base font-semibold text-white">
                  {roadmap.title}
                </h2>
                {roadmap.weeks.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/15 bg-slate-950/80 p-4 space-y-2 shadow-inner"
                  >
                    <p className="text-sm font-semibold text-white">
                      {w.week}
                      {w.focus ? ` — ${w.focus}` : ""}
                    </p>
                    <ul className="space-y-1.5">
                      {w.actions.map((task, j) => (
                        <li
                          key={j}
                          className="text-sm text-slate-200 flex gap-2"
                        >
                          <span className="text-orange-400 shrink-0">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {roadmap.resources.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-white mb-2">
                      {t("CareerRisk.resources", "Resources")}
                    </p>
                    <ul className="space-y-1">
                      {roadmap.resources.map((r, i) => (
                        <li key={i} className="text-sm text-slate-200">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {migrationError && (
              <div className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{migrationError}</span>
              </div>
            )}

            {migration && (
              <section className="space-y-4 border-t border-red-500/20 pt-5">
                <h2 className="text-base font-semibold text-white">
                  {migration.title}
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {migration.summary}
                </p>
                <div className="space-y-3">
                  {migration.countries.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 space-y-2"
                    >
                      <p className="text-sm font-bold text-white">
                        {c.country}
                      </p>
                      <p className="text-sm text-slate-200">
                        <span className="text-red-300 font-medium">
                          {t("CareerRisk.demand", "Demand")}:{" "}
                        </span>
                        {c.demand}
                      </p>
                      <p className="text-sm text-slate-200">
                        <span className="text-red-300 font-medium">
                          {t("CareerRisk.pathway", "Pathway")}:{" "}
                        </span>
                        {c.pathway}
                      </p>
                      {c.notes ? (
                        <p className="text-sm text-slate-300">{c.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {migration.caveats.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-semibold text-amber-300 mb-1">
                      {t("CareerRisk.caveats", "Important notes")}
                    </p>
                    <ul className="space-y-1">
                      {migration.caveats.map((c, i) => (
                        <li key={i} className="text-xs text-slate-300">
                          • {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/search"
                className="text-xs text-cyan-400 hover:underline"
              >
                {t("CareerRisk.browseJobs", "Browse matching jobs")}
              </Link>
              <Link
                href="/resume-builder"
                className="text-xs text-cyan-400 hover:underline"
              >
                {t("CareerRisk.improveResume", "Improve resume with AI")}
              </Link>
              {sharePath && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                  onClick={() => void copyShare()}
                >
                  <Copy className="w-3 h-3" />
                  {copied
                    ? t("CareerRisk.copied", "Copied")
                    : t("CareerRisk.copyShare", "Copy share link")}
                </button>
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="glass rounded-2xl p-5 border border-white/10 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">
                {t("CareerRisk.history", "Your recent analyses")}
              </h2>
            </div>
            <ul className="space-y-3">
              {history.slice(0, 8).map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {h.jobTitle}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {h.summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="font-semibold text-cyan-300 tabular-nums"
                      dir="ltr"
                    >
                      {h.riskScore}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {levelLabel(h.riskLevel)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
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
            <div className="space-y-3 mt-6">
              <button
                type="button"
                onClick={continueWithGoogle}
                className="w-full rounded-xl bg-white text-slate-900 font-semibold text-sm py-3"
              >
                {t("Auth.continueGoogle", "Continue with Google")}
              </button>
              <button
                type="button"
                onClick={continueWithEmail}
                className="w-full rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm py-3"
              >
                {t("Common.signIn", "Sign in")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
