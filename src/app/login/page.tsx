"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: auth logic
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              Global<span className="gradient-text">Job</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-section p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="glass-input w-full pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="glass-input w-full pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-[var(--glass-border)] bg-transparent" />
                <span className="text-[var(--text-muted)]">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[var(--text-muted)]">Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
