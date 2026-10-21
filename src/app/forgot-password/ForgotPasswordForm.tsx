"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";
import { useLocale } from "@/components/locale-provider";

export default function ForgotPasswordForm() {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);
    setStatus(result.success ? "success" : "error");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--text-primary)] mb-1"
        >
          {t("Auth.email", "Email Address")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="glass-input w-full"
          placeholder="you@example.com"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading
          ? t("AuthExtra.sending", "Sending...")
          : t("AuthExtra.sendReset", "Send Reset Link")}
      </button>
      {status === "success" && (
        <p className="text-sm text-green-500 text-center">
          {t(
            "AuthExtra.forgotSuccess",
            "If an account exists, a reset link has been sent."
          )}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 text-center">
          {t("Auth.errors.generic", "Something went wrong. Please try again.")}
        </p>
      )}
      <p className="text-center text-sm text-[var(--text-muted)]">
        {t("AuthExtra.rememberPassword", "Remember your password?")}{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--ios-blue)] hover:underline"
        >
          {t("Common.signIn", "Sign in")}
        </Link>
      </p>
    </form>
  );
}
