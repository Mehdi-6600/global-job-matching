"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Timer, TrendingUp } from "lucide-react";

type UrgencyData = {
  featured: { slotsLeft: number; slotsTotal: number; isAlmostFull: boolean; socialProofText: string; valueProp: string };
  stats: { totalJobs: number; totalApps: number };
  prices: { weekly: number; monthly: number };
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://global-job-matching.vercel.app";

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

  return (
    <div className={`mx-auto max-w-6xl rounded-xl border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${f.isAlmostFull ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
      <div className="flex items-center gap-3 text-sm">
        <span className={`inline-flex items-center gap-1.5 font-semibold ${f.isAlmostFull ? "text-amber-700" : "text-emerald-700"}`}>
          {f.isAlmostFull ? <Flame className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          {f.slotsLeft === 0 ? "Featured full — waitlist open" : `Only ${f.slotsLeft}/${f.slotsTotal} featured spots left`}
        </span>
        <span className="hidden sm:inline text-muted-foreground">• {f.socialProofText}</span>
        <span className="hidden lg:inline-flex items-center gap-1 text-muted-foreground"><Timer className="h-3.5 w-3.5" /> 24h promo: {f.valueProp}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/pricing" className="text-sm font-semibold bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800">
          Feature $ {data.prices.weekly} / 7d →
        </Link>
        <Link href="/employer/post-job" className="text-sm font-semibold border px-4 py-2 rounded-lg hover:bg-white">
          Post Job
        </Link>
      </div>
    </div>
  );
}
