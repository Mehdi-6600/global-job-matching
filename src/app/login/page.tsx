"use client";

import { useState } from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In | Global Job Matching",
  description: "Sign in to your Global Job Matching account.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ✅ جلوگیری از reload صفحه
    setLoading(true);

    // اینجا بعداً NextAuth یا API call می‌زنی
    console.log({ email, password, remember });

    // شبیه‌سازی ۱ ثانیه‌ای لودینگ
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full glass-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sign In</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Welcome back to Global Job Matching</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="glass-input w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="glass-input w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--ios-blue)] focus:ring-[var(--ios-blue)]"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-[var(--text-secondary)]">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--ios-blue)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-[var(--ios-blue)] hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}
