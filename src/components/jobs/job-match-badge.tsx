"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type MatchPayload = {
  profileComplete?: boolean;
  match?: {
    score: number;
    level?: string;
  } | null;
  message?: string;
  error?: string;
};

export function JobMatchBadge({ jobId }: { jobId: string }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MatchPayload | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setUnauthorized(false);

    const controller = new AbortController();

    fetch(`/api/jobs/${encodeURIComponent(jobId)}/match`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (cancelled) return null;

        if (res.status === 401) {
          setUnauthorized(true);
          return null;
        }

        if (!res.ok) {
          setFailed(true);
          return null;
        }

        return res.json().catch(() => null);
      })
      .then((json) => {
        if (cancelled) return;
        if (json) setData(json);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("JobDetail.matchLoading", "Checking match…")}
      </div>
    );
  }

  if (unauthorized) {
    return (
      <Link
        href={`/login?callbackUrl=/jobs/${jobId}`}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
      >
        <Target className="w-3.5 h-3.5" />
        {t("JobDetail.loginForMatch", "Log in to see your match score")}
      </Link>
    );
  }

  if (failed) {
    return null;
  }

  if (data?.profileComplete === false) {
    return (
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--warning)] hover:text-[var(--warning)]"
      >
        <Target className="w-3.5 h-3.5" />
        {t(
          "JobDetail.matchNeedProfile",
          "Complete profile for match score",
        )}
      </Link>
    );
  }

  const score =
    typeof data?.match?.score === "number"
      ? Math.round(data.match.score)
      : null;

  if (score == null) return null;

  const color =
    score >= 75
      ? "text-[var(--success)] border-[var(--success)] bg-[var(--success-soft)]"
      : score >= 50
        ? "text-[var(--brand-primary)] border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]"
        : "text-[var(--warning)] border-[var(--warning)] bg-[var(--warning-soft)]";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}
      title={t("JobDetail.matchScore", "Your match score for this job")}
    >
      <Target className="w-3.5 h-3.5" />
      {score}% {t("JobDetail.matchLabel", "match")}
    </div>
  );
}
