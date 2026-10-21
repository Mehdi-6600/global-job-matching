"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export default function BootstrapOwnerPage() {
  const { t } = useLocale();
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
          t(
            "Common.success",
            "Success. Log out and sign in again with the same email."
          )
        );
      } else {
        setMsg(data.error || `${t("Common.error", "Error")}: ${res.status}`);
      }
    } catch {
      setMsg(t("Common.errorNetwork", "Network error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h1 className="text-xl font-bold">
          {t("Nav.admin", "Bootstrap Owner")}
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          {t(
            "Dashboard.welcomeSub",
            "One-time setup. You must be signed in with OWNER_EMAIL."
          )}
        </p>
        <button
          type="button"
          onClick={runBootstrap}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold"
        >
          {loading
            ? t("Common.loading", "Please wait...")
            : t("Nav.admin", "Make me Owner")}
        </button>
        {msg && (
          <p className="text-sm text-cyan-300 whitespace-pre-wrap">{msg}</p>
        )}
        <Link
          href="/dashboard"
          className="block text-center text-slate-400 text-sm"
        >
          {t("Common.back", "Back to dashboard")}
        </Link>
      </div>
    </main>
  );
}
