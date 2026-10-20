"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, CheckCircle2, Lock } from "lucide-react";
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

const levelColor: Record<string, string> = {
  low: "text-[var(--success)] border-[var(--success)] bg-[var(--success-soft)]",
  medium: "text-[var(--warning)] border-[var(--warning)] bg-[var(--warning-soft)]",
  high: "text-[var(--error)] border-[var(--error)] bg-[var(--error-soft)]",
};

export default function CareerRiskSharePage() {
  const { t, locale } = useLocale();
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
        const res = await fetch(`/api/career/risk/share/${encodeURIComponent(token)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setError(
              (typeof json.error === "string" && json.error) ||
                t("Common.noResults", "Not found")
            );
          }
          return;
        }
        if (!cancelled) setData(json.assessment ?? null);
      } catch {
        if (!cancelled) {
          setError(t("Common.error", "Failed to load report"));
        }
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
      <div className="gjm-page text-[var(--text-primary)] flex items-center justify-center p-6">
        <p className="text-[var(--text-muted)]">{t("Common.loading", "Loading report…")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gjm-page text-[var(--text-primary)] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-[var(--error)]">
          {error || t("Common.noResults", "Report not found")}
        </p>
        <Link
          href="/career-risk"
          className="text-[var(--brand-primary)] hover:underline text-sm"
        >
          {t("CareerRisk.title", "Run your own assessment")}
        </Link>
      </div>
    );
  }

  const level = String(data.riskLevel || "medium").toLowerCase();
  const levelLabel =
    level === "low"
      ? t("CareerRisk.levelLow", "Low")
      : level === "high"
        ? t("CareerRisk.levelHigh", "High")
        : t("CareerRisk.levelMedium", "Medium");

  return (
    <div className="gjm-page text-[var(--text-primary)] p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/career-risk"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("CareerRisk.cta", "New assessment")}
        </Link>

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--brand-primary-soft)] border border-[var(--brand-primary)] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {t("CareerRisk.title", "Career Risk Report")}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {data.createdAt
                ? new Date(data.createdAt).toLocaleString(locale)
                : ""}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {data.jobTitle}
              </p>
              <span
                className={`inline-flex mt-2 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  levelColor[level] || levelColor.medium
                }`}
              >
                {levelLabel} · {data.riskScore}/100
              </span>
            </div>
          </div>

          {data.summary && (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{data.summary}</p>
          )}

          {Array.isArray(data.reasons) && data.reasons.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                {t("CareerRisk.whyScore", "Why this score")}
              </h2>
              <ul className="space-y-1.5">
                {data.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-[var(--text-body)] flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(data.skillsToBuild) && data.skillsToBuild.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                {t("CareerRisk.skillsToBuild", "Skills to build")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.skillsToBuild.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] px-2.5 py-1 text-xs text-[var(--brand-primary-hover)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              {t("CareerRisk.alternatives", "Alternative paths")}
            </h2>
            {data.alternativesLocked ||
            !Array.isArray(data.alternatives) ||
            data.alternatives.length === 0 ? (
              <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-3 text-sm text-[var(--text-body)] flex gap-2">
                <Lock className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                <div>
                  <p>
                    {t(
                      "CareerRisk.alternativesLocked",
                      "Upgrade to Pro to unlock alternative role recommendations."
                    )}
                  </p>
                  <Link
                    href="/pricing"
                    className="text-[var(--brand-primary)] hover:underline text-xs mt-1 inline-block"
                  >
                    {t("CareerRisk.viewPricing", "View pricing")}
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {data.alternatives.map((a, i) => (
                  <li key={i} className="text-sm text-[var(--text-body)]">
                    • {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)]">
          <Link href="/career-risk" className="text-[var(--brand-primary)] hover:underline">
            {t("CareerRisk.cta", "Run your own AI career risk analysis")}
          </Link>
        </p>
      </div>
    </div>
  );
}
