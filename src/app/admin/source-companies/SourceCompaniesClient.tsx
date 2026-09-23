"use client";

import { useState } from "react";

type Row = {
  id: string;
  provider: string;
  boardIdentifier: string;
  companyName: string;
  status: string;
  legalStatus: string;
  robotsStatus: string;
  termsStatus: string;
  healthStatus: string;
  consecutiveFailures: number;
  lastErrorAt: string | null;
  lastError: string | null;
  lastCheckedAt: string | null;
};

type Summary = {
  total: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  byLegalStatus: Record<string, number>;
};

type Props = {
  initialRows: Row[];
  initialSummary: Summary;
};

export default function SourceCompaniesClient({
  initialRows,
  initialSummary,
}: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/source-companies", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        companies: Row[];
        summary: Summary;
      };
      setRows(data.companies);
      setSummary(data.summary);
    } catch {
      // silent
    }
  }

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/source-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setMessage(`خطا: ${data.error || res.status}`);
        return;
      }
      setMessage("انجام شد ✓");
      await refresh();
    } catch (e) {
      setMessage(`خطای شبکه: ${e instanceof Error ? e.message : "?"}`);
    } finally {
      setBusy(null);
    }
  }

  function statusBadge(row: Row): { text: string; cls: string } {
    if (row.status === "active" && row.legalStatus === "APPROVED") {
      return { text: "✅ تأییدشده و فعال", cls: "bg-green-100 text-green-900" };
    }
    if (row.status === "blocked" || row.legalStatus === "DISABLED") {
      return { text: "🚫 غیرفعال", cls: "bg-red-100 text-red-900" };
    }
    return { text: "⏳ در انتظار بررسی حقوقی", cls: "bg-yellow-100 text-yellow-900" };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        مدیریت منابع ATS
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        این صفحه فقط برای ادمین است. تصمیم حقوقی با شماست — من به‌جای
        شما تأیید نمی‌کنم.
      </p>

      {/* --- دکمه اصلی --- */}
      <button
        onClick={() => post({ action: "seed" }, "seed")}
        disabled={busy !== null}
        className="mb-6 w-full rounded-2xl bg-green-600 px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
      >
        {busy === "seed"
          ? "در حال افزودن..."
          : "🌱 افزودن شرکت‌های کاندیدا"}
      </button>

      {message && (
        <div className="mb-6 rounded-lg bg-gray-100 px-4 py-3 text-center text-sm">
          {message}
        </div>
      )}

      {/* --- خلاصه --- */}
      <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-sm">
        <div>کل: {summary.total}</div>
        <div>
          به ازای provider:{" "}
          {Object.entries(summary.byProvider)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" • ") || "—"}
        </div>
        <div>
          وضعیت:{" "}
          {Object.entries(summary.byStatus)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" • ") || "—"}
        </div>
      </div>

      {/* --- لیست --- */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-gray-500">
          هنوز هیچ شرکتی اضافه نشده. دکمه سبز بالا را بزن.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const badge = statusBadge(row);
            const active =
              row.status === "active" && row.legalStatus === "APPROVED";
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold">{row.companyName}</div>
                    <div className="text-xs text-gray-500">
                      {row.provider} • {row.boardIdentifier}
                    </div>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </div>

                {row.lastError && (
                  <div className="mb-3 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                    آخرین خطا: {row.lastError}
                  </div>
                )}

                <div className="flex gap-2">
                  {!active && (
                    <button
                      onClick={() =>
                        post(
                          {
                            action: "update",
                            id: row.id,
                            status: "active",
                            legalStatus: "APPROVED",
                            robotsStatus: "allowed",
                            termsStatus: "allowed",
                          },
                          row.id,
                        )
                      }
                      disabled={busy !== null}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
                    >
                      {busy === row.id ? "..." : "✅ تأیید حقوقی"}
                    </button>
                  )}
                  {active && (
                    <button
                      onClick={() =>
                        post(
                          {
                            action: "update",
                            id: row.id,
                            status: "blocked",
                            legalStatus: "DISABLED",
                          },
                          row.id,
                        )
                      }
                      disabled={busy !== null}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
                    >
                      {busy === row.id ? "..." : "🚫 غیرفعال کن"}
                    </button>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  {active
                    ? "این شرکت مجاز است. jobهایش در sync شبانه وارد سایت می‌شوند."
                    : "برای تأیید، اول Terms و robots این شرکت را خوانده‌ای، سپس این دکمه را بزن."}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
