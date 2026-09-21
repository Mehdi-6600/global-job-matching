"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Status = "success" | "error" | "missing";

export default function VerifyEmailHandler({
  status,
  errorMessage,
}: {
  status: Status;
  errorMessage?: string;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState<null | "ok" | "err">(null);

  const isLoggedIn = Boolean(session?.user?.id);

  async function handleResend() {
    setResending(true);
    setResent(null);
    try {
      const res = await fetch("/api/auth/verify/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      });
      setResent(res.ok ? "ok" : "err");
    } catch {
      setResent("err");
    } finally {
      setResending(false);
    }
  }

  /* -------- Missing params -------- */
  if (status === "missing") {
    return (
      <>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          {t("Auth.verifyEmailMissingTitle", "Invalid Link")}
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          {t(
            "Auth.verifyEmailMissingBody",
            "This verification link is missing required parameters.",
          )}
        </p>
        <Link href="/" className="btn-primary">
          {t("Nav.home", "Home")}
        </Link>
      </>
    );
  }

  /* -------- Success -------- */
  if (status === "success") {
    return (
      <>
        <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          {t("Auth.verifyEmailSuccessTitle", "Email Verified!")}
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          {t(
            "Auth.verifyEmailSuccessBody",
            "Your email has been successfully verified.",
          )}
        </p>
        {isLoggedIn ? (
          <Link href="/dashboard" className="btn-primary">
            {t("Nav.dashboard", "Dashboard")}
          </Link>
        ) : (
          <Link href="/login" className="btn-primary">
            {t("Common.signIn", "Sign in")}
          </Link>
        )}
      </>
    );
  }

  /* -------- Error -------- */
  return (
    <>
      <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {t("Auth.verifyEmailErrorTitle", "Verification Failed")}
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        {errorMessage ||
          t(
            "Auth.verifyEmailErrorBody",
            "The link is invalid or has expired.",
          )}
      </p>

      {isLoggedIn ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Auth.verifyEmailResending", "Sending...")}
              </>
            ) : (
              t("Auth.verifyEmailResend", "Resend verification email")
            )}
          </button>

          {resent === "ok" && (
            <p className="text-sm text-green-400">
              {t(
                "Auth.verifyEmailResent",
                "Verification email sent. Check your inbox.",
              )}
            </p>
          )}
          {resent === "err" && (
            <p className="text-sm text-red-400">
              {t(
                "Auth.verifyEmailResendFailed",
                "Could not send the email. Please try again later.",
              )}
            </p>
          )}
        </div>
      ) : (
        <Link href="/login" className="btn-primary">
          {t("Common.signIn", "Sign in")}
        </Link>
      )}
    </>
  );
}
