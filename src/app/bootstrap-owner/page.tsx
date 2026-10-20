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
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 space-y-4">
        <h1 className="text-xl font-bold">
          {t("Nav.admin", "Bootstrap Owner")}
        </h1>
        <p className="text-[var(--text-body)] text-sm leading-relaxed">
          {t(
            "Dashboard.welcomeSub",
            "One-time setup. You must be signed in with OWNER_EMAIL."
          )}
        </p>
        <button
          type="button"
          onClick={runBootstrap}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] disabled:opacity-50 font-semibold"
        >
          {loading
            ? t("Common.loading", "Please wait...")
            : t("Nav.admin", "Make me Owner")}
        </button>
        {msg && (
          <p className="text-sm text-[var(--brand-primary)] whitespace-pre-wrap">{msg}</p>
        )}
        <Link
          href="/dashboard"
          className="block text-center text-[var(--text-muted)] text-sm"
        >
          {t("Common.back", "Back to dashboard")}
        </Link>
      </div>
    </div>
  );
}
