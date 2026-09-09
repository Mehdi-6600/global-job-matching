"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  AlertCircle,
  Eye,
  Clock,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type TopPath = { path: string; views: number };
type RecentEvent = {
  id: string;
  path: string;
  referrer: string | null;
  userId: string | null;
  createdAt: string;
};

export default function AdminAnalyticsPage() {
  const { t, locale } = useLocale();
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalViews, setTotalViews] = useState(0);
  const [topPaths, setTopPaths] = useState<TopPath[]>([]);
  const [recent, setRecent] = useState<RecentEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/analytics?days=${days}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!cancelled) {
            setError(data.error || t("Common.error", "Failed to load analytics"));
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setTotalViews(data.totalViews || 0);
          setTopPaths(data.topPaths || []);
          setRecent(data.recent || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(t("Common.errorNetwork", "Network error"));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4" />{" "}
              {t("Common.back", "Back to Admin")}
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              {t("Dashboard.stats", "Analytics")}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t("Dashboard.welcomeSub", "Page views (Owner/Admin only)")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  days === d
                    ? "bg-cyan-600 text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{totalViews}</p>
                  <p className="text-slate-400 text-sm">
                    {t("Dashboard.stats", "Total views")} ({days}d)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-white font-semibold mb-4">
                  {t("Dashboard.stats", "Top paths")}
                </h2>
                {topPaths.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    {t("Common.noResults", "No data")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topPaths.map((p) => (
                      <li
                        key={p.path}
                        className="flex justify-between text-sm gap-4"
                      >
                        <span className="text-slate-300 truncate">{p.path}</span>
                        <span className="text-cyan-400 shrink-0">{p.views}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass rounded-2xl p-6 border border-white/10">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {t("Dashboard.recent", "Recent")}
                </h2>
                {recent.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    {t("Common.noResults", "No events")}
                  </p>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-y-auto">
                    {recent.map((e) => (
                      <li key={e.id} className="text-sm border-b border-white/5 pb-2">
                        <p className="text-slate-200 truncate">{e.path}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(e.createdAt).toLocaleString(locale)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
