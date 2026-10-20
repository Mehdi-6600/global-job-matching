"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type UrgencyData = {
  featured: {
    slotsLeft: number;
    slotsTotal: number;
    isAlmostFull: boolean;
    campaignEndsAt?: string | null;
  };
  stats: { totalJobs: number; featuredCount: number };
  prices: { weekly: number; monthly: number };
};

export default function FeaturedUrgencyBanner() {
  const { t } = useLocale();
  const [data, setData] = useState<UrgencyData | null>(null);

  useEffect(() => {
    fetch("/api/monetization/urgency", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setData({
            featured: j.featured,
            stats: j.stats,
            prices: j.prices,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;
  const f = data.featured;

  // Honest: only real slots left, no fake social proof.
  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        f.isAlmostFull
          ? "border-[var(--warning-soft)] bg-[var(--warning-soft)]"
          : "border-[var(--success-soft)] bg-[var(--success-soft)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span
          className={[
            "inline-flex items-center gap-1.5 font-semibold",
            f.isAlmostFull ? "text-[var(--warning)]" : "text-[var(--success)]",
          ].join(" ")}
        >
          {f.isAlmostFull ? (
            <Flame size={15} aria-hidden="true" />
          ) : (
            <TrendingUp size={15} aria-hidden="true" />
          )}
          {f.slotsLeft === 0
            ? t("Home.featuredFull", "Featured slots are full — waitlist open")
            : t("Home.featuredSpotsLeft", "Only {left}/{total} featured spots left")
                .split("{left}")
                .join(String(f.slotsLeft))
                .split("{total}")
                .join(String(f.slotsTotal))}
        </span>

        <span className="hidden text-[var(--text-muted)] sm:inline">
          ·{" "}
          {t("Home.featuredStats", "{featured} featured · {jobs} active jobs")
            .split("{featured}")
            .join(String(data.stats.featuredCount))
            .split("{jobs}")
            .join(data.stats.totalJobs.toLocaleString())}
        </span>

        {f.campaignEndsAt ? (
          <span className="hidden text-[var(--text-muted)] lg:inline">
            ·{" "}
            {t("Home.campaignEnds", "Ends {date}").replace(
              "{date}",
              new Date(f.campaignEndsAt).toLocaleDateString(),
            )}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-action)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-action-hover)]"
        >
          {t("Home.featureCta", "Feature · ${price} / 7d").replace(
            "${price}",
            String(data.prices.weekly),
          )}
        </Link>
        <Link
          href="/employer/post-job"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
        >
          {t("Home.postJobCta", "Post a job")}
        </Link>
      </div>
    </div>
  );
}
