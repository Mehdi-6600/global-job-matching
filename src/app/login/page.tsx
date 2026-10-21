"use client";

import { useState, Suspense, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { AuthShell } from "@/components/auth-shell";
import { safeCallbackOr } from "@/lib/url-safety";

const fieldClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] ps-10 pe-3.5 text-[0.9375rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] transition-colors focus-visible:border-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary-soft)]";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl = useMemo(
    () => safeCallbackOr(callbackUrlParam, "/dashboard"),
    [callbackUrlParam],
  );

  const registered = searchParams.get("registered") === "1";
  const sessionExpired = searchParams.get("error") === "SessionExpired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sessionExpired) {
      setNotice(
        t(
          "Auth.sessionExpired",
          "Your session has expired. Please sign in again to continue.",
        ),
      );
      return;
    }
    if (registered) {
      setNotice(
        t(
          "Auth.registeredSuccess",
          "Account created. Please sign in to continue.",
        ),
      );
    }
  }, [sessionExpired, registered, t]);

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const code = String(result.error).toLowerCase();
        if (code.includes("rate_limited") || code.includes("ratelimit")) {
          setError(
            t(
              "Auth.errors.rateLimited",
              "Too many login attempts. Please wait a minute and try again.",
            ),
          );
        } else {
          setError(
            t("Auth.errors.invalidCredentials", "Invalid email or password"),
          );
        }
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      // Auth.js can return an unsuccessful response without an error code
      // (for example, when the auth endpoint responds unexpectedly). Never
      // leave the user on the form without feedback in that case.
      setError(
        t("Auth.errors.network", "Network error. Please try again."),
      );
    } catch {
      // A failed fetch used to leave `loading` true forever, making the login
      // page look frozen. Show a retryable error and always release the form.
      setError(
        t("Auth.errors.network", "Network error. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const registerHref = useMemo(() => {
    if (!callbackUrlParam) return "/register";
    const safe = safeCallbackOr(callbackUrlParam, "/dashboard");
    return `/register?callbackUrl=${encodeURIComponent(safe)}`;
  }, [callbackUrlParam]);

  return (
    <AuthShell
      title={t("Auth.loginTitle", "Welcome back")}
      subtitle={t("Auth.loginSubtitle", "Sign in to continue")}
      footer={
        <>
          {t("Auth.noAccount", "Don't have an account?")}{" "}
          <Link
            href={registerHref}
            className="font-semibold text-[var(--brand-primary-hover)] hover:underline"
          >
            {t("Auth.submitRegister", "Create Account")}
          </Link>
        </>
      }
    >
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--info-soft)] bg-[var(--info-soft)] px-3.5 py-3 text-[0.8125rem] text-[var(--info)]"
        >
          <AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => {
              void signIn("google", { callbackUrl });
            }}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.8 14.6 3 12 3 7.6 3 4 6.6 4 11s3.6 8 8 8c4.6 0 7.6-3.2 7.6-7.8 0-.5 0-.9-.1-1.3H12z"
              />
            </svg>
            {t("Auth.continueGoogle", "Continue with Google")}
          </button>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border-soft)]" />
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
              {t("Auth.continueEmail", "Continue with email")}
            </span>
            <span className="h-px flex-1 bg-[var(--border-soft)]" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--error-soft)] bg-[var(--error-soft)] px-3.5 py-3 text-[0.8125rem] font-medium text-[var(--error)]"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text-body)]"
          >
            {t("Auth.email", "Email")}
          </label>
          <div className="relative">
            <Mail
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="block text-[0.8125rem] font-semibold text-[var(--text-body)]"
            >
              {t("Auth.password", "Password")}
            </label>
            <Link
              href="/forgot-password"
              className="text-[0.75rem] font-semibold text-[var(--brand-primary-hover)] hover:underline"
            >
              {t("Auth.forgotPassword", "Forgot password?")}
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-action)] py-3 text-[0.9375rem] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-action-hover)] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {t("Auth.signingIn", "Signing in...")}
            </>
          ) : (
            t("Auth.submitLogin", "Sign In")
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="gjm-page">
          <div className="gjm-container flex justify-center py-20">
            <Loader2
              size={26}
              className="animate-spin text-[var(--brand-primary)]"
              aria-hidden="true"
            />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
