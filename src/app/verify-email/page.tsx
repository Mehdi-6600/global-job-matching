"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("success");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            We're confirming your email address
          </p>
        </div>

        <div className="glass rounded-3xl p-10 shadow-2xl">
          {status === "loading" && (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Verifying...
              </h3>
              <p className="text-sm text-white/50">
                Please wait while we verify your email address
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Email Verified!
              </h3>
              <p className="text-sm text-white/50 mb-8">
                Your email has been successfully verified. You can now access all
                features.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 group"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Verification Failed
              </h3>
              <p className="text-sm text-white/50 mb-8">
                The verification link is invalid or has expired.
              </p>
              <button className="w-full h-12 glass hover:bg-white/15 rounded-xl font-semibold text-white transition-all duration-300">
                Resend Verification Email
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/40">
          <Mail className="w-4 h-4" />
          <span>Need help? </span>
          <Link
            href="/contact"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
