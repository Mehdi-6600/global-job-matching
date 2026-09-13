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
import { messageFromAiHttpError } from "@/lib/ai-client-errors";

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
  const n = (v: unknown) => {
    const x = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(x)) return null;
    return Math.max(0, Math.min(100, Math.round(x)));
  };
  const taskAutomation = n(o.taskAutomation);
  const toolMaturity = n(o.toolMaturity);
  const marketAdoption = n(o.marketAdoption);
  const agenticExposure = n(o.agenticExposure);
  if (
    taskAutomation == null ||
    toolMaturity == null ||
    marketAdoption == null ||
    agenticExposure == null
  ) {
    return undefined;
  }
  return { taskAutomation, toolMaturity, marketAdoption, agenticExposure };
}

function parseAnalysisPayload(data: unknown): CareerRiskAnalysis | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const jobTitle = String(d.jobTitle || "").trim();
  const riskScore = Number(d.riskScore);
  const riskLevel = String(d.riskLevel || "").toLowerCase();
  const summary = String(d.summary || "").trim();
  if (!jobTitle || !Number.isFinite(riskScore) || !summary) return null;
  if (!["low", "medium", "high"].includes(riskLevel)) return null;
  return {
    jobTitle,
    riskScore: Math.max(0, Math.min(100, Math.round(riskScore))),
    riskLevel: riskLevel as "low" | "medium" | "high",
    summary,
    reasons: Array.isArray(d.reasons)
      ? d.reasons.map((x) => String(x)).filter(Boolean)
      : [],
    skillsToBuild: Array.isArray(d.skillsToBuild)
      ? d.skillsToBuild.map((x) => String(x)).filter(Boolean)
      : [],
    alternatives: Array.isArray(d.alternatives)
      ? d.alternatives.map((x) => String(x)).filter(Boolean)
      : [],
    subScores: parseSubScores(d.subScores),
    timeHorizon: d.timeHorizon != null ? String(d.timeHorizon) : undefined,
    confidence:
      d.confidence != null && Number.isFinite(Number(d.confidence))
        ? Number(d.confidence)
        : undefined,
    source: d.source === "heuristic" ? "heuristic" : "ai",
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="text-slate-300 tabular-nums">{v}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export default function CareerRiskPage() {
  const { t, locale } = useLocale();
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

  const levelLabel = useCallback(
    (level: string) => {
      if (level === "low") return t("CareerRisk.levelLow", "Low");
      if (level === "medium") return t("CareerRisk.levelMedium", "Medium");
      if (level === "high") return t("CareerRisk.levelHigh", "High");
      return level;
    },
    [t]
  );

  const stepsAfterRiskHint = useMemo(
    () =>
      t(
        "CareerRisk.stepsAfterRisk",
        "The steps below unlock after you run a risk analysis."
      ),
    [t]
  );

  const currentForm = useCallback((): CareerRiskFormInput & {
    locale?: string;
  } => {
    const years = experienceYears.trim()
      ? Number(experienceYears)
      : undefined;
    return {
      jobTitle: jobTitle.trim(),
      skills: skills.trim() || undefined,
      industry: industry.trim() || undefined,
      experienceYears:
        years != null && Number.isFinite(years) ? years : undefined,
      country: country.trim() || undefined,
      location: location.trim() || undefined,
      education: education.trim() || undefined,
      locale: locale || "en",
    };
  }, [
    jobTitle,
    skills,
    industry,
    experienceYears,
    country,
    location,
    education,
    locale,
  ]);

  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/career/risk", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray((data as { assessments?: unknown }).assessments)
        ? (data as { assessments: HistoryItem[] }).assessments
        : [];
      setHistory(
        items.map((a) => ({
          id: String(a.id),
          jobTitle: String(a.jobTitle || ""),
          riskScore: Number(a.riskScore) || 0,
          riskLevel: String(a.riskLevel || ""),
          summary: String(a.summary || ""),
          sharePath: a.sharePath,
          createdAt: String(a.createdAt || ""),
        }))
      );
    } catch {
      /* ignore */
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
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb)
          ) || t("CareerRisk.failed", "Failed to analyze career risk")
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
          jobTitle: analysis.jobTitle,
          skillsToBuild: analysis.skillsToBuild,
          reasons: analysis.reasons,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          summary: analysis.summary,
          country: country.trim() || undefined,
          location: location.trim() || undefined,
          experienceYears: experienceYears.trim()
            ? Number(experienceYears)
            : undefined,
          industry: industry.trim() || undefined,
          skills: skills.trim() || undefined,
          education: education.trim() || undefined,
          locale: locale || "en",
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
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb)
          ) || t("CareerRisk.roadmapFailed", "Failed to build roadmap")
        );
        setRoadmapLoading(false);
        return;
      }
      const weeksRaw = Array.isArray((data as { weeks?: unknown }).weeks)
        ? (data as { weeks: RoadmapWeek[] }).weeks
        : [];
      setRoadmap({
        title: String((data as { title?: string }).title || ""),
        weeks: weeksRaw.map((w) => ({
          week: String(w.week || ""),
          focus: String(w.focus || ""),
          actions: Array.isArray(w.actions)
            ? w.actions.map((a) => String(a))
            : [],
        })),
        resources: Array.isArray((data as { resources?: unknown }).resources)
          ? ((data as { resources: string[] }).resources || []).map((x) =>
              String(x)
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
  }, [
    analysis,
    country,
    location,
    experienceYears,
    industry,
    skills,
    education,
    locale,
    t,
  ]);

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
          jobTitle: analysis.jobTitle,
          skills: skills.trim() || undefined,
          industry: industry.trim() || undefined,
          experienceYears: experienceYears.trim()
            ? Number(experienceYears)
            : undefined,
          country: country.trim() || undefined,
          location: location.trim() || undefined,
          education: education.trim() || undefined,
          skillsToBuild: analysis.skillsToBuild,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          locale: locale || "en",
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
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb)
          ) ||
            t(
              "CareerRisk.migrationFailed",
              "Failed to analyze migration options"
            )
        );
        setMigrationLoading(false);
        return;
      }
      const countries = Array.isArray(
        (data as { countries?: unknown }).countries
      )
        ? ((data as { countries: MigrationCountry[] }).countries || []).map(
            (c) => ({
              country: String(c.country || ""),
              demand: String(c.demand || ""),
              pathway: String(c.pathway || ""),
              notes: String(c.notes || ""),
            })
          )
        : [];
      setMigration({
        title: String((data as { title?: string }).title || ""),
        summary: String((data as { summary?: string }).summary || ""),
        countries,
        caveats: Array.isArray((data as { caveats?: unknown }).caveats)
          ? ((data as { caveats: string[] }).caveats || []).map((x) =>
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
  }, [
    analysis,
    skills,
    industry,
    experienceYears,
    country,
    location,
    education,
    locale,
    t,
  ]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jobTitle.trim().length < 2) {
      setError(
        t("CareerRisk.jobTitleRequired", "Please enter a job title (min 2 characters).")
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
    void signIn("google", { callbackUrl: "/career-risk" });
  }

  function continueWithEmail() {
    saveCareerRiskDraft(currentForm(), { autoSubmit: true });
    window.location.href = "/login?callbackUrl=/career-risk";
  }

  async function copyShare() {
    if (!sharePath) return;
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${sharePath}`
          : sharePath;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const sourceLabel = useMemo(() => {
    if (!analysis) return "";
    return analysis.source === "heuristic"
      ? t("CareerRisk.sourceHeuristic", "Estimated (offline fallback)")
      : t("CareerRisk.sourceAi", "AI analysis");
  }, [analysis, t]);

  const canSecondary = Boolean(analysis) && !loading;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back")}
        </Link>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {t("CareerRisk.title", "AI Career Risk")}
            </h1>
            <p"
 className="text-slate-400 text-sm leading-relaxed             ">
              {t(
                "CareerRisk.subtitle />
",
                "See how automation may affect your role, then            unlock a 90-day roadmap and </ migration insights."
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl border border-white/10 p-5 sm:p-6 space-y-4 mb-6"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("CareerRisk.jobTitle", "Job title")} *
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder={t(
                "CareerRisk.jobTitlePlaceholder",
                "e.g. Frontend Developer"
              )}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.skills", "Skills")}
              </label>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                maxLength={500}
                placeholder={t(
                  "CareerRisk.skillsPlaceholder",
                  "React, TypeScript, …"
                )}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.industry", "Industry")}
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                maxLength={120}
                placeholder={t(
                  "CareerRisk.industryPlaceholder",
                  "SaaS, healthcare, …"
                )}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.experience", "Years of experience")}
              </label>
              <input
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                inputMode="numeric"
                placeholder="5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.education", "Education")}
              </label>
              <input
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                maxLength={200}
                placeholder={t(
                  "CareerRisk.educationPlaceholder",
                  "BSc Computer Science"
                )}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.country", "Country")}
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={100}
                placeholder={t("CareerRisk.countryPlaceholder", "Germany")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {t("CareerRisk.location", "City / region")}
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                placeholder={t("CareerRisk.locationPlaceholder", "Berlin")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {stepsAfterRiskHint}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("CareerRisk.analyzing", "Analyzing…")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("CareerRisk.analyze", "Analyze risk")}
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!canSecondary || roadmapLoading}
              onClick={() => void generateRoadmap()}
              className={
                canSecondary
                  ? "flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-orange-500 text-black shadow-lg shadow-orange-500/30 hover:bg-orange-400 disabled:opacity-60 transition-all"
                  : "flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
              }
            >
              {roadmapLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Map className="w-4 h-4" />
              )}
              {t("CareerRisk.roadmapCta", "90-day roadmap")}
            </button>
            <button
              type="button"
              disabled={!canSecondary || migrationLoading}
              onClick={() => void generateMigration()}
              className={
                canSecondary
                  ? "flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-red-700 text-white shadow-lg shadow-red-900/40 hover:bg-red-600 disabled:opacity-60 transition-all"
                  : "flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
              }
            >
              {migrationLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plane className="w-4 h-4" />
              )}
              {t("CareerRisk.migrationCta", "Migration options")}
            </button>
          </div>
        </form>

        {showAuthGate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass max-w-md w-full rounded-2xl border border-white/10 p-6 relative">
              <button
                type="button"
                onClick={() => setShowAuthGate(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">
                  {t("CareerRisk.authTitle", "Sign in to continue")}
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                {t(
                  "CareerRisk.authBody",
                  "Create a free account or sign in. We will keep your form and run the analysis after login."
                )}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={continueWithGoogle}
                  className="w-full py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm"
                >
                  {t("Auth.continueGoogle", "Continue with Google")}
                </button>
                <button
                  type="button"
                  onClick={continueWithEmail}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm"
                >
                  {t("Auth.continueEmail", "Continue with email")}
                </button>
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <section className="glass rounded-2xl border border-white/10 p-5 sm:p-6 mb-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {analysis.jobTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{sourceLabel}</p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${
                  levelColor[analysis.riskLevel] || levelColor.medium
                }`}
              >
                {levelLabel(analysis.riskLevel)} · {analysis.riskScore}/100
              </div>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed">
              {analysis.summary}
            </p>

            {analysis.subScores && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  {t("CareerRisk.subScores", "Risk factors")}
                </h3>
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
                  label={t("CareerRisk.agenticExposure", "Agentic exposure")}
                  value={analysis.subScores.agenticExposure}
                />
              </div>
            )}

            {analysis.reasons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.why", "Why this score")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {analysis.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.skillsToBuild.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.skillsToBuild", "Skills to build")}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {analysis.skillsToBuild.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {paid && analysis.alternatives && analysis.alternatives.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.alternatives", "Alternative paths")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {t(
                  "CareerRisk.alternativesLocked",
                  "Upgrade to Pro to unlock alternative role recommendations."
                )}{" "}
                <Link href="/pricing" className="text-cyan-400 hover:underline">
                  {t("CareerRisk.viewPricing", "View pricing")}
                </Link>
              </p>
            )}

            {upgradeMessage && (
              <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                {upgradeMessage}
              </p>
            )}

            {sharePath && (
              <button
                type="button"
                onClick={() => void copyShare()}
                className="inline-flex items-center gap-2 text-xs text-slate-300 border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/5"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied
                  ? t("Common.success", "Copied")
                  : t("CareerRisk.copyShare", "Copy share link")}
              </button>
            )}
          </section>
        )}

        {(roadmap || roadmapError) && (
          <section className="glass rounded-2xl border border-orange-500/20 p-5 sm:p-6 mb-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-orange-400" />
              {t("CareerRisk.roadmapTitle", "90-day roadmap")}
            </h2>
            {roadmapError && (
              <div
                role="alert"
                className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{roadmapError}</span>
              </div>
            )}
            {roadmap && (
              <>
                {roadmap.title && (
                  <p className="text-slate-200 text-sm font-medium">
                    {roadmap.title}
                  </p>
                )}
                <div className="space-y-3">
                  {roadmap.weeks.map((w, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-orange-200 text-sm font-semibold mb-1">
                        {w.week}
                        {w.focus ? ` — ${w.focus}` : ""}
                      </p>
                      <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                        {w.actions.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {roadmap.resources.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      {t("CareerRisk.resources", "Resources")}
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {roadmap.resources.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {(migration || migrationError) && (
          <section className="glass rounded-2xl border border-red-500/25 p-5 sm:p-6 mb-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plane className="w-5 h-5 text-red-400" />
              {t("CareerRisk.migrationTitle", "Migration options")}
            </h2>
            {migrationError && (
              <div
                role="alert"
                className="flex items-start gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{migrationError}</span>
              </div>
            )}
            {migration && (
              <>
                {migration.summary && (
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {migration.summary}
                  </p>
                )}
                <ul className="space-y-3">
                  {migration.countries.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-white font-semibold text-sm mb-1">
                        {c.country}
                      </p>
                      {c.demand && (
                        <p className="text-sm text-slate-300">
                          <span className="text-red-300 font-medium">
                            {t("CareerRisk.demand", "Demand")}:{" "}
                          </span>
                          {c.demand}
                        </p>
                      )}
                      {c.pathway && (
                        <p className="text-sm text-slate-300">
                          <span className="text-red-300 font-medium">
                            {t("CareerRisk.pathway", "Pathway")}:{" "}
                          </span>
                          {c.pathway}
                        </p>
                      )}
                      {c.notes && (
                        <p className="text-sm text-slate-400 mt-1">{c.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
                {migration.caveats.length > 0 && (
                  <div className="text-xs text-slate-400 space-y-1">
                    {migration.caveats.map((c, i) => (
                      <p key={i}>• {c}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              {t("CareerRisk.history", "Recent analyses")}
            </h2>
            <ul className="space-y-2">
              {history.slice(0, 8).map((h) => (
                <li
                  key={h.id}
                  className="text-sm text-slate-300 border border-white/10 rounded-xl px-3 py-2 flex justify-between gap-2"
                >
                  <span className="truncate">
                    {h.jobTitle}{" "}
                    <span className="text-slate-500">
                      ({h.riskScore}/100)
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleDateString(locale)
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
