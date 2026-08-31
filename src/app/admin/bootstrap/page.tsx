"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminBootstrapPage() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function runBootstrap() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/bootstrap", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMsg(
          "موفق شدی. الان خارج شو و دوباره با همان جیمیل وارد شو."
        );
      } else {
        setMsg(data.error || `خطا: ${res.status}`);
      }
    } catch {
      setMsg("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h1 className="text-xl font-bold">Bootstrap Owner</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          فقط یک‌بار. باید با همان جیمیل OWNER_EMAIL وارد شده باشی.
        </p>
        <button
          type="button"
          onClick={runBootstrap}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold"
        >
          {loading ? "صبر کن..." : "من را Owner کن"}
        </button>
        {msg && (
          <p className="text-sm text-cyan-300 whitespace-pre-wrap">{msg}</p>
        )}
        <Link href="/dashboard" className="block text-center text-slate-400 text-sm">
          بازگشت به داشبورد
        </Link>
      </div>
    </main>
  );
}
