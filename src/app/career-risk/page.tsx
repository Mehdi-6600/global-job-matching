"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const HISTORY_DISPLAY_LIMIT = 8;

const levelColor: Record<string, string> = {
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  high: "text-red-400 border-red-500/30 bg-red-500/10",
};

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Safe parsing helpers                                               */
/* ------------------------------------------------------------------ */

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
}

function toStrArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : [];
}

function toBoundedInt(v: unknown): number | null {
  const x = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function parseSubScores(raw: unknown): CareerRiskSubScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const taskAutomation = toBoundedInt(o.taskAutomation);
  const toolMaturity = toBoundedInt(o.toolMaturity);
  const marketAdoption = toBoundedInt(o.marketAdoption);
  const agenticExposure = toBoundedInt(o.agenticExposure);
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

function parseRiskLevel(raw: unknown): CareerRiskAnalysis["riskLevel"] {
  const v = String(raw ?? "medium").toLowerCase();
  return v === "low" || v === "high" || v === "medium" ? v : "medium";
}

function parseSource(raw: unknown): "ai" | "heuristic" {
  return String(raw ?? "ai").toLowerCase() === "heuristic"
    ? "heuristic"
    : "ai";
}

function parseAnalysisPayload(data: unknown): CareerRiskAnalysis | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const nested =
    root.analysis && typeof root.analysis === "object"
      ? (root.analysis as Record<string, unknown>)
      : root;

  const jobTitle = String(nested.jobTitle ?? root.jobTitle ?? "").trim();
  const riskScore = toBoundedInt(nested.riskScore ?? root.riskScore);
  if (!jobTitle || riskScore == null) return null;

  return {
    jobTitle,
    riskScore,
    riskLevel: parseRiskLevel(nested.riskLevel ?? root.riskLevel),
    summary: String(nested.summary ?? root.summary ?? "").trim(),
    reasons: toStrArray(nested.reasons ?? root.reasons),
    skillsToBuild: toStrArray(nested.skillsToBuild ?? root.skillsToBuild),
    alternatives: toStrArray(nested.alternatives ?? root.alternatives),
    source: parseSource(nested.source ?? root.source),
    subScores: parseSubScores(nested.subScores ?? root.subScores),
    timeHorizon:
      typeof (nested.timeHorizon ?? root.timeHorizon) === "string"
        ? String(nested.timeHorizon ?? root.timeHorizon)
        : undefined,
    confidence:
      typeof (nested.confidence ?? root.confidence) === "number"
        ? Number(nested.confidence ?? root.confidence)
        : undefined,
    industryOutlook:
      typeof (nested.industryOutlook ?? root.industryOutlook) === "string"
        ? String(nested.industryOutlook ?? root.industryOutlook)
        : undefined,
  };
}

function parseRoadmap(data: unknown): RoadmapResult | null {
  const d = asRecord(data);
  const weeksRaw = Array.isArray(d.weeks) ? d.weeks : [];
  return {
    title: String(d.title || ""),
    weeks: weeksRaw.map((w) => {
      const week = asRecord(w);
      return {
        week: String(week.week || ""),
        focus: String(week.focus || ""),
        actions: toStrArray(week.actions),
      };
    }),
    resources: toStrArray(d.resources),
    source: parseSource(d.source),
  };
}

function parseMigration(data: unknown): MigrationResult | null {
  const d = asRecord(data);
  const countries = Array.isArray(d.countries)
    ? d.countries.map((c) => {
        const row = asRecord(c);
        return {
          country: String(row.country || ""),
          demand: String(row.demand || ""),
          pathway: String(row.pathway || ""),
          notes: String(row.notes || ""),
        };
      })
    : [];
  return {
    title: String(d.title || ""),
    summary: String(d.summary || ""),
    countries,
    caveats: toStrArray(d.caveats),
    source: parseSource(d.source),
  };
}

function parseHistory(data: unknown): HistoryItem[] {
  const raw =
    asRecord(data).assessments ??
    asRecord(data).items ??
    asRecord(data).history;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const h = asRecord(item);
      return {
        id: String(h.id || ""),
        jobTitle: String(h.jobTitle || ""),
        riskScore: Number(h.riskScore) || 0,
        riskLevel: String(h.riskLevel || ""),
        summary: String(h.summary || ""),
        sharePath: h.sharePath ? String(h.sharePath) : undefined,
        createdAt: String(h.createdAt || ""),
      };
    })
    .filter((h) => h.id && h.jobTitle);
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CareerRiskPage() {
  const { t, locale } = useLocale();
  const { status } = useSession();

  /* -------- Form state -------- */
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");

  /* -------- Analysis state -------- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<CareerRiskAnalysis | null>(null);
  const [paid, setPaid] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  /* -------- Roadmap state -------- */
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);

  /* -------- Migration state -------- */
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationError, setMigrationError] = useState("");
  const [migration, setMigration] = useState<MigrationResult | null>(null);

  /* -------- Derived -------- */
  const levelLabel = useCallback(
    (level: string) => {
      if (level === "low") return t("CareerRisk.levelLow", "Low");
      if (level === "medium") return t("CareerRisk.levelMedium", "Medium");
      if (level === "high") return t("CareerRisk.levelHigh", "High");
      return level;
    },
    [t],
  );

  const stepsAfterRiskHint = useMemo(
    () =>
      t(
        "CareerRisk.stepsAfterRisk",
        "Enter a job title — roadmap and migration work on their own (sign-in required).",
      ),
    [t],
  );

  const currentForm = useCallback((): CareerRiskFormInput => {
    const years = experienceYears.trim() ? Number(experienceYears) : undefined;
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

  const analysisContext = useMemo(
    () => ({
      // Standalone: form job title is enough when no prior risk analysis
      jobTitle: (analysis?.jobTitle || jobTitle).trim(),
      skillsToBuild: analysis?.skillsToBuild || [],
      reasons: analysis?.reasons || [],
      riskScore: analysis?.riskScore,
      riskLevel: analysis?.riskLevel,
      summary: analysis?.summary,
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
    [
      analysis,
      jobTitle,
      country,
      location,
      experienceYears,
      industry,
      skills,
      education,
      locale,
    ],
  );

  /* -------- History loader -------- */
  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/career/risk", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      setHistory(parseHistory(data));
    } catch {
      /* ignore */
    }
  }, [status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  /* -------- Run analysis -------- */
  const runAnalysis = useCallback(async () => {
    if (loading) return;
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
        return;
      }

      if (!res.ok) {
        setError(
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb),
          ) || t("CareerRisk.failed", "Failed to analyze career risk"),
        );
        return;
      }

      const parsed = parseAnalysisPayload(data);
      if (!parsed) {
        setError(t("Common.error", "Something went wrong"));
        return;
      }

      const d = asRecord(data);
      setAnalysis(parsed);
      setPaid(Boolean(d.paid));
      if (typeof d.sharePath === "string" && d.sharePath) {
        setSharePath(d.sharePath);
      }
      if (typeof d.message === "string" && d.message) {
        setUpgradeMessage(d.message);
      }
      clearCareerRiskDraft();
      trackEvent("career_risk_success");
      void loadHistory();
    } catch {
      setError(t("Auth.errors.network", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [currentForm, t, loadHistory, loading]);

  /* -------- Roadmap -------- */
  const generateRoadmap = useCallback(async () => {
    if (jobTitle.trim().length < 2) {
      setRoadmapError(
        t(
          "CareerRisk.jobTitleRequired",
          "Please enter a job title (min 2 characters).",
        ),
      );
      return;
    }
    if (status !== "authenticated") {
      saveCareerRiskDraft(currentForm(), { autoSubmit: false });
      setShowAuthGate(true);
      return;
    }
    setRoadmapError("");
    setRoadmapLoading(true);
    trackEvent("career_roadmap_submit");
    try {
      const res = await fetch("/api/career/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(analysisContext),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setShowAuthGate(true);
        return;
      }
      if (!res.ok) {
        setRoadmapError(
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb),
          ) || t("CareerRisk.roadmapFailed", "Failed to build roadmap"),
        );
        return;
      }
      const parsed = parseRoadmap(data);
      if (parsed) {
        setRoadmap(parsed);
        trackEvent("career_roadmap_success");
      }
    } catch {
      setRoadmapError(
        t("Auth.errors.network", "Network error. Please try again."),
      );
    } finally {
      setRoadmapLoading(false);
    }
  }, [analysisContext, jobTitle, status, t, currentForm]);

  /* -------- Migration -------- */
  const generateMigration = useCallback(async () => {
    if (jobTitle.trim().length < 2) {
      setMigrationError(
        t(
          "CareerRisk.jobTitleRequired",
          "Please enter a job title (min 2 characters).",
        ),
      );
      return;
    }
    if (status !== "authenticated") {
      saveCareerRiskDraft(currentForm(), { autoSubmit: false });
      setShowAuthGate(true);
      return;
    }
    setMigrationError("");
    setMigrationLoading(true);
    trackEvent("career_migration_submit");
    try {
      const res = await fetch("/api/career/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(analysisContext),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setShowAuthGate(true);
        return;
      }
      if (!res.ok) {
        setMigrationError(
          messageFromAiHttpError(
            res.status,
            data as { error?: string; code?: string },
            (k, fb) => t(k, fb),
          ) ||
            t(
              "CareerRisk.migrationFailed",
              "Failed to analyze migration options",
            ),
        );
        return;
      }
      const parsed = parseMigration(data);
      if (parsed) {
        setMigration(parsed);
        trackEvent("career_migration_success");
      }
    } catch {
      setMigrationError(
        t("Auth.errors.network", "Network error. Please try again."),
      );
    } finally {
      setMigrationLoading(false);
    }
  }, [analysisContext, jobTitle, status, t, currentForm]);

  /* -------- Draft restore -------- */
  useEffect(() => {
    const draft = loadCareerRiskDraft();
    if (!draft?.form) return;
    const f = draft.form;
    setJobTitle(f.jobTitle || "");
    setSkills(f.skills || "");
    setIndustry(f.industry || "");
    setExperienceYears(
      f.experienceYears != null ? String(f.experienceYears) : "",
    );
    setCountry(f.country || "");
    setLocation(f.location || "");
    setEducation(f.education || "");

    if (draft.autoSubmit && status === "authenticated") {
      clearCareerRiskDraft();
      void runAnalysis();
    }
  }, [status, runAnalysis]);

  /* -------- Handlers -------- */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (jobTitle.trim().length < 2) {
      setError(
        t(
          "CareerRisk.jobTitleRequired",
          "Please enter a job title (min 2 characters).",
        ),
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

  // Each tool is independent — only a job title is required (auth on click).
  const canSecondary = jobTitle.trim().length >= 2 && !loading;

  /* -------- Render -------- */
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {t("CareerRisk.title", "AI Career Risk")}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t(
                "CareerRisk.subtitle",
                "See how exposed your role is to AI and automation — then unlock a 90-day roadmap and migration paths.",
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 sm:p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              {t("CareerRisk.jobTitle", "Job title")} *
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              placeholder={t(
                "CareerRisk.jobTitlePlaceholder",
                "e.g. Frontend Developer",
              )}
              required
              minLength={2}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.skills", "Skills")}
              </label>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                placeholder={t(
                  "CareerRisk.skillsPlaceholder",
                  "React, TypeScript, ...",
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.industry", "Industry")}
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                placeholder={t(
                  "CareerRisk.industryPlaceholder",
                  "SaaS, Healthcare, ...",
                )}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.experienceYears", "Years of experience")}
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.education", "Education")}
              </label>
              <input
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                placeholder={t(
                  "CareerRisk.educationPlaceholder",
                  "BSc Computer Science",
                )}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.country", "Country")}
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                placeholder={t("CareerRisk.countryPlaceholder", "Germany")}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                {t("CareerRisk.location", "City / region")}
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                placeholder={t("CareerRisk.locationPlaceholder", "Berlin")}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-slate-500">{stepsAfterRiskHint}</p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading
                ? t("CareerRisk.analyzing", "Analyzing…")
                : t("CareerRisk.analyze", "Analyze risk")}
            </button>

            <button
              type="button"
              disabled={!canSecondary || roadmapLoading}
              onClick={() => void generateRoadmap()}
              className={
                canSecondary
                  ? "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black bg-orange-400 shadow-lg shadow-orange-500/30 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  : "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 bg-slate-700/50 border border-white/5 cursor-not-allowed"
              }
            >
              {roadmapLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Map className="w-4 h-4" />
              )}
              {t("CareerRisk.roadmapBtn", "90-day roadmap")}
            </button>

            <button
              type="button"
              disabled={!canSecondary || migrationLoading}
              onClick={() => void generateMigration()}
              className={
                canSecondary
                  ? "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-red-700 shadow-lg shadow-red-900/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  : "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 bg-slate-700/50 border border-white/5 cursor-not-allowed"
              }
            >
              {migrationLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plane className="w-4 h-4" />
              )}
              {t("CareerRisk.migrationBtn", "Migration options")}
            </button>
          </div>
        </form>

        {/* Auth gate modal */}
        {showAuthGate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {t("CareerRisk.authTitle", "Sign in to continue")}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAuthGate(false)}
                  className="text-slate-400 hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                {t(
                  "CareerRisk.authBody",
                  "Create a free account or sign in so we can save your analysis and unlock roadmap tools.",
                )}
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={continueWithGoogle}
                  className="w-full rounded-xl bg-white text-slate-900 font-medium py-2.5 text-sm hover:bg-slate-100"
                >
                  {t("Auth.continueGoogle", "Continue with Google")}
                </button>
                <button
                  type="button"
                  onClick={continueWithEmail}
                  className="w-full rounded-xl border border-white/15 text-white font-medium py-2.5 text-sm hover:bg-white/5"
                >
                  {t("Auth.continueEmail", "Continue with email")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis section */}
        {analysis && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {analysis.jobTitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      levelColor[analysis.riskLevel] || levelColor.medium
                    }`}
                  >
                    {levelLabel(analysis.riskLevel)} · {analysis.riskScore}/100
                  </span>
                  <span className="text-xs text-slate-500">{sourceLabel}</span>
                </div>
              </div>
              {sharePath && (
                <button
                  type="button"
                  onClick={() => void copyShare()}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied
                    ? t("Common.copied", "Copied")
                    : t("CareerRisk.copyShare", "Copy share link")}
                </button>
              )}
            </div>

            {analysis.summary && (
              <p className="text-slate-200 text-sm leading-relaxed">
                {analysis.summary}
              </p>
            )}

            {analysis.subScores && (
              <div className="grid sm:grid-cols-2 gap-3">
                <ScoreBar
                  label={t("CareerRisk.subTask", "Task automation")}
                  value={analysis.subScores.taskAutomation}
                />
                <ScoreBar
                  label={t("CareerRisk.subTool", "Tool maturity")}
                  value={analysis.subScores.toolMaturity}
                />
                <ScoreBar
                  label={t("CareerRisk.subMarket", "Market adoption")}
                  value={analysis.subScores.marketAdoption}
                />
                <ScoreBar
                  label={t("CareerRisk.subAgentic", "Agentic exposure")}
                  value={analysis.subScores.agenticExposure}
                />
              </div>
            )}

            {analysis.reasons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.whyScore", "Why this score")}
                </h3>
                <ul className="space-y-1.5">
                  {analysis.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.skillsToBuild.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {t("CareerRisk.skillsToBuild", "Skills to build")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.skillsToBuild.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {t("CareerRisk.alternatives", "Alternative paths")}
              </h3>
              {paid && analysis.alternatives.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.alternatives.map((a, i) => (
                    <li key={i} className="text-sm text-slate-300">
                      • {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-sm text-slate-300 flex gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p>
                      {upgradeMessage ||
                        t(
                          "CareerRisk.alternativesLocked",
                          "Upgrade to Pro to unlock alternative role recommendations.",
                        )}
                    </p>
                    <Link
                      href="/pricing"
                      className="text-cyan-300 hover:underline text-xs mt-1 inline-block"
                    >
                      {t("CareerRisk.viewPricing", "View pricing")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Roadmap section */}
        {(roadmapLoading || roadmapError || roadmap) && (
          <section className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Map className="w-4 h-4 text-orange-300" />
              {t("CareerRisk.roadmapTitle", "90-day roadmap")}
            </h2>
            {roadmapLoading && (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("CareerRisk.roadmapLoading", "Building your roadmap…")}
              </p>
            )}
            {roadmapError && (
              <p className="text-sm text-red-300">{roadmapError}</p>
            )}
            {roadmap && (
              <>
                {roadmap.title && (
                  <p className="text-sm text-slate-200 font-medium">
                    {roadmap.title}
                  </p>
                )}
                <ul className="space-y-3">
                  {roadmap.weeks.map((w, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-white/10 bg-slate-900/40 p-3"
                    >
                      <p className="text-xs text-orange-300 font-semibold">
                        {w.week}
                      </p>
                      <p className="text-sm text-white mt-0.5">{w.focus}</p>
                      {w.actions.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {w.actions.map((a, j) => (
                            <li key={j} className="text-xs text-slate-300">
                              • {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                {roadmap.resources.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      {t("CareerRisk.resources", "Resources")}
                    </p>
                    <ul className="space-y-1">
                      {roadmap.resources.map((r, i) => (
                        <li key={i} className="text-xs text-slate-300">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Migration section */}
        {(migrationLoading || migrationError || migration) && (
          <section className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/5 p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Plane className="w-4 h-4 text-red-300" />
              {t("CareerRisk.migrationTitle", "Migration options")}
            </h2>
            {migrationLoading && (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t(
                  "CareerRisk.migrationLoading",
                  "Analyzing migration paths…",
                )}
              </p>
            )}
            {migrationError && (
              <p className="text-sm text-red-300">{migrationError}</p>
            )}
            {migration && (
              <>
                {migration.summary && (
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {migration.summary}
                  </p>
                )}
                <ul className="space-y-3">
                  {migration.countries.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-white/10 bg-slate-900/40 p-3"
                    >
                      <p className="text-sm font-semibold text-white">
                        {c.country}
                      </p>
                      {c.demand && (
                        <p className="text-sm text-slate-300 mt-1">
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

        {/* History section */}
        {history.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              {t("CareerRisk.history", "Recent analyses")}
            </h2>
            <ul className="space-y-2">
              {history.slice(0, HISTORY_DISPLAY_LIMIT).map((h) => (
                <li
                  key={h.id}
                  className="text-sm text-slate-300 border border-white/10 rounded-xl px-3 py-2 flex justify-between gap-2"
                >
                  <span className="truncate">
                    {h.jobTitle}{" "}
                    <span className="text-slate-500">({h.riskScore}/100)</span>
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
