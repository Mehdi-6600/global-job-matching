"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";

type UrgencyData = {
  featured: { slotsLeft: number; slotsTotal: number; isAlmostFull: boolean; campaignEndsAt?: string | null };
  stats: { totalJobs: number; featuredCount: number };
  prices: { weekly: number; monthly: number };
};

export default function FeaturedUrgencyBanner() {
  const [data, setData] = useState<UrgencyData | null>(null);

  useEffect(() => {
    fetch("/api/monetization/urgency", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData({ featured: j.featured, stats: j.stats, prices: j.prices });
      })
      .catch(() => {});
  }, []);

  if (!data) return null;
  const f = data.featured;

  // Honest: only show real slots left, no fake social proof
  return (
    <div
      className={`mx-auto max-w-6xl rounded-xl border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
        f.isAlmostFull ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className="flex items-center gap-3 text-sm">
        <span
          className={`inline-flex items-center gap-1.5 font-semibold ${
            f.isAlmostFull ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {f.isAlmostFull ? <Flame className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          {f.slotsLeft === 0 ? "Featured full — waitlist open" : `Only ${f.slotsLeft}/${f.slotsTotal} featured spots left`}
        </span>
        <span className="hidden sm:inline text-muted-foreground">
          • {data.stats.featuredCount} featured now · {data.stats.totalJobs.toLocaleString()} active jobs
        </span>
        {f.campaignEndsAt ? (
          <span className="hidden lg:inline text-muted-foreground">• Campaign ends {new Date(f.campaignEndsAt).toLocaleDateString()}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/pricing" className="text-sm font-semibold bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800">
          Feature ${data.prices.weekly} / 7d →
        </Link>
        <Link href="/employer/post-job" className="text-sm font-semibold border px-4 py-2 rounded-lg hover:bg-white">
          Post Job
        </Link>
      </div>
    </div>
  );
}
