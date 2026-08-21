"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verifyEmailToken } from "./actions";

export default function VerifyEmailHandler({ token }: { token?: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }

    verifyEmailToken(token).then((result) => {
      setStatus(result.success ? "success" : "error");
    });
  }, [token]);

  if (status === "loading") {
    return (
      <>
        <div className="mx-auto w-12 h-12 border-4 border-[var(--glass-border)] border-t-[var(--ios-blue)] rounded-full animate-spin mb-4" />
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Verifying your email...</h1>
      </>
    );
  }

  if (status === "missing") {
    return (
      <>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Invalid Link</h1>
        <p className="text-[var(--text-muted)] mb-6">The verification link is missing or expired.</p>
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
      </>
    );
  }

  if (status === "success") {
    return (
      <>
        <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Email Verified!</h1>
        <p className="text-[var(--text-muted)] mb-6">Your email has been successfully verified.</p>
        <Link href="/login" className="btn-primary">
          Sign In
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Verification Failed</h1>
      <p className="text-[var(--text-muted)] mb-6">The link is invalid or has expired.</p>
      <Link href="/contact" className="btn-primary">
        Contact Support
      </Link>
    </>
  );
}
