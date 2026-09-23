"use client";

import { useState } from "react";

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

export default function SyncClient() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<SourceStat[] | null>(null);

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
      <p className="mb-6 text-sm text-gray-600">
        Cron خودکار هر شب ساعت ۳ بامداد UTC اجرا می‌شود. این صفحه فقط
        برای وقتی است که می‌خواهی <strong>الان</strong> نتیجه را ببینی.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => runSync()}
          disabled={busy !== null}
          className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {busy === "all" ? "در حال اجرا..." : "🔄 اجرای همه منابع"}
        </button>
        <button
          onClick={() => runSync("jobicy")}
          disabled={busy !== null}
          className="w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {busy === "jobicy" ? "در حال اجرا..." : "🌱 فقط Jobicy"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => runSync("arbeitnow")}
          disabled={busy !== null}
          className="w-full rounded-2xl bg-gray-700 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {busy === "arbeitnow" ? "در حال اجرا..." : "فقط Arbeitnow"}
        </button>
        <button
          onClick={() => runSync("remoteok")}
          disabled={busy !== null}
          className="w-full rounded-2xl bg-gray-400 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {busy === "remoteok" ? "در حال اجرا..." : "فقط RemoteOK (غیرفعال)"}
        </button>
      </div>

      {message && (
        <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3 text-center text-sm">
          {message}
        </div>
      )}

      {stats && stats.length > 0 && (
        <div className="space-y-4">
          {stats.map((s) => (
            <div
              key={s.sourceKey}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-lg font-bold">{s.sourceKey}</div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    s.completeness === "FULL"
                      ? "bg-green-100 text-green-900"
                      : s.completeness === "FAILED"
                        ? "bg-red-100 text-red-900"
                        : "bg-yellow-100 text-yellow-900"
                  }`}
                >
                  {s.completeness}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 sm:grid-cols-3">
                <div>دریافت: {s.fetched}</div>
                <div className="font-semibold text-green-700">
                  ایجاد جدید: {s.created}
                </div>
                <div>به‌روزرسانی: {s.updated}</div>
                <div>تکراری: {s.duplicates}</div>
                <div>رد کیفیت: {s.qualityRejected}</div>
                <div>خطا: {s.failed}</div>
              </div>
              {s.errors.length > 0 && (
                <div className="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
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
