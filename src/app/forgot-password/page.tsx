"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Common.error", "Something went wrong"));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gjm-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 border border-[var(--border)] shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-accent-soft)] mb-4">
              <Mail className="w-6 h-6 text-[var(--brand-accent)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("AuthExtra.forgotTitle", "Forgot password")}
            </h1>
            <p className="text-[var(--text-muted)] mt-2 text-sm">
              {t(
                "AuthExtra.forgotSubtitle",
                "Enter your email and we will send a reset link"
              )}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto" />
              <p className="text-[var(--text-body)] text-sm">
                {t(
                  "AuthExtra.forgotSubtitle",
                  "If an account exists, a reset link has been sent."
                )}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("AuthExtra.backToLogin", "Back to login")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-body)] mb-2">
                  {t("Auth.email", "Email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] font-medium transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("AuthExtra.sending", "Sending...")}
                  </>
                ) : (
                  t("AuthExtra.sendReset", "Send reset link")
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
          )}
        </div>
      </div>
    </div>
  );
}
