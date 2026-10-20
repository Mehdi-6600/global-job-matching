"use client";

import { useCallback, useEffect, useState } from "react";

type SourceStat = {
  sourceKey: string;
  completeness: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  duplicates: number;
  qualityRejected: number;
  failed: number;
  durationMs?: number;
  errors: string[];
};

type RegistrySource = {
  key: string;
  name: string;
  type: string;
  enabled: boolean;
  runnable: boolean;
  licenseStatus: string;
};

/**
 * Per-source color palette. Any source key not listed gets the
 * fallback (indigo). Keeps new sources usable without a code change.
 */
const COLOR_BY_KEY: Record<string, string> = {
  arbeitnow: "bg-[var(--surface-3)]",
  jobicy: "bg-[var(--success)]",
  remoteok: "bg-[var(--brand-accent)]",
  greenhouse: "bg-[var(--info)]",
  lever: "bg-[var(--warning)]",
  ashby: "bg-[var(--brand-accent)]",
  usajobs: "bg-[#003366]",
  themuse: "bg-[#53b6ac]",
  recruitee: "bg-[#ff6b35]",
  smartrecruiters: "bg-[#0f172a]",
  workable: "bg-[#00a99d]",
};

function colorFor(key: string): string {
  return COLOR_BY_KEY[key] ?? "bg-[var(--brand-accent)]";
}

export default function SyncClient() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<SourceStat[] | null>(null);
  const [sources, setSources] = useState<RegistrySource[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setSourcesError(null);
    try {
      const res = await fetch("/api/admin/sync/sources", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        sources?: RegistrySource[];
        error?: string;
      };
      if (!res.ok || !data.sources) {
        setSourcesError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSources(data.sources);
    } catch (e) {
      setSourcesError(e instanceof Error ? e.message : "network_error");
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  async function runSync(source?: string) {
    const label = source || "all";
    setBusy(label);
    setMessage(null);
    setStats(null);
    try {
      const url = source
        ? `/api/admin/sync?source=${encodeURIComponent(source)}`
        : "/api/admin/sync";
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        stats?: SourceStat[];
        durationMs?: number;
      };
      if (!res.ok || !data.success) {
        setMessage(`خطا: ${data.error || res.status}`);
        return;
      }
      setStats(data.stats ?? []);
      setMessage(`تمام شد در ${data.durationMs ?? "?"} میلی‌ثانیه`);
    } catch (e) {
      setMessage(`خطای شبکه: ${e instanceof Error ? e.message : "?"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">اجرای دستی sync</h1>
      <p className="mb-6 text-sm text-[var(--text-subtle)]">
        Cron خودکار هر شب ساعت ۳ بامداد UTC اجرا می‌شود. این صفحه فقط
        برای وقتی است که می‌خواهی <strong>الان</strong> نتیجه را ببینی.
        <br />
        <strong>پیشنهاد:</strong> هر منبع را جداگانه اجرا کن — این‌طور هر
        منبع کل بودجه‌ی زمانی خودش را دارد.
      </p>

      {/* --- همه --- */}
      <button
        onClick={() => runSync()}
        disabled={busy !== null}
        className="mb-4 w-full rounded-2xl bg-[var(--info)] px-6 py-4 text-lg font-bold text-[var(--text-primary)] shadow-lg active:scale-95 disabled:opacity-50"
      >
        {busy === "all" ? "در حال اجرا..." : "🔄 اجرای همه منابع"}
      </button>

      {/* --- بارگذاری مجدد --- */}
      <button
        onClick={() => void loadSources()}
        disabled={busy !== null || sources === null}
        className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
      >
        🔃 بارگذاری مجدد لیست منابع
      </button>

      {/* --- خطای بارگذاری --- */}
      {sourcesError && (
        <div className="mb-4 rounded-lg bg-[var(--error-soft)] px-4 py-3 text-sm text-[var(--error-strong)]">
          خطا در بارگذاری منابع: {sourcesError}
        </div>
      )}

      {/* --- دکمه‌های per-source --- */}
      {sources === null ? (
        <div className="mb-4 text-center text-sm text-[var(--text-muted)]">
          در حال بارگذاری لیست منابع...
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sources.map((s) => {
            const disabled = busy !== null || !s.runnable;
            return (
              <button
                key={s.key}
                onClick={() => runSync(s.key)}
                disabled={disabled}
                className={`w-full rounded-2xl px-6 py-4 text-lg font-bold text-[var(--text-on-brand)] shadow-lg active:scale-95 disabled:opacity-50 ${colorFor(
                  s.key,
                )}`}
                title={
                  s.runnable
                    ? `اجرای ${s.name}`
                    : `${s.name} غیرفعال است (${s.licenseStatus})`
                }
              >
                {busy === s.key
                  ? "در حال اجرا..."
                  : s.runnable
                    ? `فقط ${s.name}`
                    : `فقط ${s.name} (غیرفعال)`}
              </button>
            );
          })}
        </div>
      )}

      {/* --- پیام --- */}
      {message && (
        <div className="mb-6 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-center text-sm">
          {message}
        </div>
      )}

      {/* --- نتایج --- */}
      {stats && stats.length > 0 && (
        <div className="space-y-4">
          {stats.map((s) => (
            <div
              key={s.sourceKey}
              className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-lg font-bold">{s.sourceKey}</div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    s.completeness === "FULL"
                      ? "bg-[var(--success-soft)] text-[var(--success-strong)]"
                      : s.completeness === "FAILED"
                        ? "bg-[var(--error-soft)] text-[var(--error-strong)]"
                        : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {s.completeness}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-primary)] sm:grid-cols-3">
                <div>دریافت: {s.fetched}</div>
                <div className="font-semibold text-[var(--success)]">
                  ایجاد جدید: {s.created}
                </div>
                <div>به‌روزرسانی: {s.updated}</div>
                <div>تکراری: {s.duplicates}</div>
                <div>رد کیفیت: {s.qualityRejected}</div>
                <div>خطا: {s.failed}</div>
              </div>
              {s.errors.length > 0 && (
                <div className="mt-3 rounded bg-[var(--error-soft)] px-2 py-1 text-xs text-[var(--error-strong)]">
                  {s.errors.slice(0, 5).join(" • ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
