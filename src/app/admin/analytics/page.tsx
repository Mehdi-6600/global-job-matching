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

type TopPath = { path: string; views: number };
type RecentEvent = {
  id: string;
  path: string;
  referrer: string | null;
  userId: string | null;
  createdAt: string;
};

export default function AdminAnalyticsPage() {
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
            setError(data.error || "Failed to load analytics");
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
          setError("Network error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              Analytics
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Page views stored in AnalyticsEvent (Owner/Admin only)
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
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-6 border border-red-500/20 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{totalViews}</p>
                  <p className="text-slate-400 text-sm">
                    Total page views (last {days} days)
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">
                Top paths
              </h2>
              {topPaths.length === 0 ? (
                <p className="text-slate-500 text-sm">No data yet</p>
              ) : (
                <ul className="space-y-2">
                  {topPaths.map((row) => (
                    <li
                      key={row.path}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <code className="text-sm text-cyan-300 break-all">
                        {row.path}
                      </code>
                      <span className="text-sm text-white font-medium tabular-nums">
                        {row.views}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Recent events
              </h2>
              {recent.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent events</p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((ev) => (
                    <li
                      key={ev.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <code className="text-cyan-300">{ev.path}</code>
                        <span className="text-slate-500 text-xs">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {ev.referrer && (
                        <p className="text-slate-500 text-xs mt-1 truncate">
                          ref: {ev.referrer}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
