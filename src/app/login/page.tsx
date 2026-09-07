"use client";

import { useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { safeCallbackOr } from "@/lib/url-safety";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const callbackUrl = useMemo(
    () => safeCallbackOr(searchParams.get("callbackUrl"), "/dashboard"),
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      const code = String(result.error).toLowerCase();
      if (code.includes("rate_limited") || code.includes("ratelimit")) {
        setError(
          t(
            "Auth.errors.rateLimited",
            "Too many login attempts. Please wait a minute and try again."
          )
        );
      } else {
        setError(
          t("Auth.errors.invalidCredentials", "Invalid email or password")
        );
      }
      return;
    }

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-white">
              Global Job Matching
            </span>
          </Link>
          <p className="mt-2 text-slate-400 text-sm">
            {t("Auth.loginSubtitle", "Sign in to continue")}
          </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t("Auth.email", "Email")}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3.5 px-5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t("Auth.password", "Password")}
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3.5 px-5 rounded-xl outline-none transition-all bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-end text-sm">
              <Link
                href="/forgot-password"
                className="text-sky-400 hover:underline font-medium"
              >
                {t("Auth.forgotPassword", "Forgot password?")}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Auth.signingIn", "Signing in...")}
                </>
              ) : (
                t("Auth.submitLogin", "Sign In")
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-400">
            {t("Auth.noAccount", "Don't have an account?")}{" "}
            <Link
              href="/register"
              className="font-medium text-sky-400 hover:underline"
            >
              {t("Auth.submitRegister", "Create Account")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
