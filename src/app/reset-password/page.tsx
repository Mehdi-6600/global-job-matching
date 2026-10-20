"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

function ResetPasswordForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("Auth.passwordHint", "Password must be at least 8 characters"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Common.error", "Passwords do not match"));
      return;
    }
    if (!token) {
      setError(t("Common.error", "Invalid or missing reset token"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Common.error", "Something went wrong"));
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto" />
        <p className="text-[var(--text-body)] text-sm">
          {t("Common.success", "Success")}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--brand-accent)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("AuthExtra.backToLogin", "Back to login")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          {t("AuthExtra.newPassword", "New password")}
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
          {t("AuthExtra.confirmPassword", "Confirm password")}
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent transition-all"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !token}
        className="w-full py-3 px-4 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] font-medium transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("Common.loading", "Loading...")}
          </>
        ) : (
          t("AuthExtra.submitReset", "Update password")
        )}
      </button>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("AuthExtra.backToLogin", "Back to login")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLocale();

  return (
    <div className="gjm-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-[var(--border)] shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-accent-soft)] mb-4">
              <Lock className="w-6 h-6 text-[var(--brand-accent)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("AuthExtra.resetTitle", "Reset password")}
            </h1>
            <p className="text-[var(--text-muted)] mt-2 text-sm">
              {t(
                "AuthExtra.resetSubtitle",
                "Choose a new password for your account"
              )}
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
