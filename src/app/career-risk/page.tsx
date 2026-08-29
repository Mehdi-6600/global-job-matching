"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Analysis = {
  jobTitle: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
  skillsToBuild: string[];
  alternatives: string[];
  source: "ai" | "heuristic";
};

const levelColor = {
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  high: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function CareerRiskPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [industry, setIndustry] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [locked, setLocked] = useState(false);
  const [info, setInfo] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setAnalysis(null);

    try {
      const res = await fetch("/api/career/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          skills,
          industry,
          experienceYears: experienceYears
            ? Number(experienceYears)
            : undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/career-risk";
        return;
      }
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      setAnalysis(data.analysis);
      setLocked(Boolean(data.alternativesLocked));
      setInfo(data.message || "");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Career Risk</h1>
            <p className="text-slate-400 text-sm">
              Free estimate of how exposed your role may be to AI & automation
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-6 border border-white/10 space-y-4 mb-6"
        >
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
            placeholder="Current job title * (e.g. Accountant)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
          />
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Key skills (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
            <input
              type="number"
              min={0}
              max={50}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="Years of experience"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || jobTitle.trim().length < 2}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze risk (free)
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {info && (
              <p className="text-slate-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {info} · source: {analysis.source}
              </p>
            )}

            <div
              className={`glass rounded-2xl p-6 border ${levelColor[analysis.riskLevel]}`}
            >
              <div className="flex items-end justify-between gap-4 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    Risk level
                  </p>
                  <p className="text-2xl font-bold capitalize">
                    {analysis.riskLevel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">Score</p>
                  <p className="text-3xl font-bold">{analysis.riskScore}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-black/30 overflow-hidden mt-3">
                <div
                  className="h-full bg-current opacity-80 rounded-full"
                  style={{ width: `${analysis.riskScore}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-slate-200 leading-relaxed">
                {analysis.summary}
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
                      <span className="text-cyan-400">•</span>
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
          </div>
        )}
      </div>
    </main>
  );
}
