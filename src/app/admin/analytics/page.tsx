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
    <div className="gjm-page">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2"
            >
              <ArrowLeft className="w-4 h-4" />{" "}
              {t("Common.back", "Back to Admin")}
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[var(--brand-primary)]" />
              {t("Dashboard.stats", "Analytics")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
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
                    ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)]"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl p-6 border border-[var(--border)] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary-soft)] flex items-center justify-center">
                  <Eye className="w-6 h-6 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{totalViews}</p>
                  <p className="text-[var(--text-muted)] text-sm">
                    {t("Dashboard.stats", "Total views")} ({days}d)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 border border-[var(--border)]">
                <h2 className="text-[var(--text-primary)] font-semibold mb-4">
                  {t("Dashboard.stats", "Top paths")}
                </h2>
                {topPaths.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">
                    {t("Common.noResults", "No data")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {topPaths.map((p) => (
                      <li
                        key={p.path}
                        className="flex justify-between text-sm gap-4"
                      >
                        <span className="text-[var(--text-body)] truncate">{p.path}</span>
                        <span className="text-[var(--brand-primary)] shrink-0">{p.views}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass rounded-2xl p-6 border border-[var(--border)]">
                <h2 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                  {t("Dashboard.recent", "Recent")}
                </h2>
                {recent.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm">
                    {t("Common.noResults", "No events")}
                  </p>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-y-auto">
                    {recent.map((e) => (
                      <li key={e.id} className="text-sm border-b border-[var(--border-soft)] pb-2">
                        <p className="text-[var(--text-primary)] truncate">{e.path}</p>
                        <p className="text-[var(--text-muted)] text-xs">
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
