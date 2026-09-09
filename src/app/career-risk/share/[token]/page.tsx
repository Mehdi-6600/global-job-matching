"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

type Assessment = {
  id: string;
  jobTitle: string;
  riskScore: number;
  riskLevel: string;
  summary: string;
  reasons: string[];
  skillsToBuild: string[];
  alternatives: string[];
  alternativesLocked: boolean;
  source: string;
  createdAt: string;
};

export default function CareerRiskSharePage() {
  const { t } = useLocale();
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [data, setData] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(t("Common.error", "Invalid link"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/career/risk/share/${token}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled)
            setError(json.error || t("Common.noResults", "Not found"));
          return;
        }
        if (!cancelled) setData(json.assessment);
      } catch {
        if (!cancelled)
          setError(t("Common.error", "Failed to load report"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <p className="text-slate-400">
          {t("Common.loading", "Loading report…")}
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-400">
          {error || t("Common.noResults", "Report not found")}
        </p>
        <Link href="/career-risk" className="text-cyan-400 underline">
          {t("CareerRisk.title", "Run your own assessment")}
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-cyan-300">
            {t("CareerRisk.title", "Career Risk Report")}
          </h1>
          <Link
            href="/career-risk"
            className="text-sm text-slate-400 hover:text-cyan-400"
          >
            {t("CareerRisk.cta", "New assessment")}
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">
                {t("Settings.headline", "Role")}
              </p>
              <p className="text-xl font-medium">{data.jobTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">
                {t("CareerRisk.score", "Risk score")}
              </p>
              <p className="text-3xl font-bold text-cyan-300">
                {data.riskScore}
                <span className="text-base font-normal text-slate-400">
                  /100
                </span>
              </p>
              <p className="text-sm uppercase tracking-wide text-slate-400">
                {data.riskLevel}
              </p>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">{data.summary}</p>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {t("CareerRisk.why", "Why this score")}
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-300">
              {(data.reasons || []).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {t("CareerRisk.skills", "Skills to build")}
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-300">
              {(data.skillsToBuild || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {t("CareerRisk.alternatives", "Alternative paths")}
            </h2>
            {data.alternativesLocked || !data.alternatives?.length ? (
              <p className="text-slate-500 text-sm">
                {t(
                  "CareerRisk.locked",
                  "Alternative roles were locked for this shared free report."
                )}{" "}
                <Link href="/pricing" className="text-cyan-400 underline">
                  {t("Common.upgrade", "Upgrade")}
                </Link>
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-slate-300">
                {data.alternatives.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-slate-500">
            {t("CareerRisk.disclaimer", "Shared report · not personalized advice")}{" "}
            · {data.source}
          </p>
        </div>
      </div>
    </main>
  );
}
