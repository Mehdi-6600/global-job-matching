Here are all the files for Phase 2 — Batch 3, styled consistently with the dark glassmorphism theme.
1.  app/login/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
export default function LoginPage() {
const [showPassword, setShowPassword] = useState(false);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
{/* Background glows */}
<div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
<div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
  <div className="relative w-full max-w-md">
    {/* Logo / Brand */}
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
        Welcome Back
      </h1>
      <p className="text-white/50 mt-2 text-sm">
        Sign in to continue your job search
      </p>
    </div>

    {/* Glass Card */}
    <div className="glass rounded-3xl p-8 shadow-2xl">
      <form className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-12 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-white/50">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
        >
          Sign In
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30 uppercase tracking-wider">
          or continue with
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-3">
        <button className="h-11 glass rounded-xl flex items-center justify-center gap-2 text-sm text-white/70 hover:bg-white/15 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button className="h-11 glass rounded-xl flex items-center justify-center gap-2 text-sm text-white/70 hover:bg-white/15 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>
    </div>

    {/* Footer */}
    <p className="text-center text-sm text-white/40 mt-6">
      Don't have an account?{" "}
      <Link
        href="/register"
        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        Create one
      </Link>
    </p>
  </div>
</div>

);
}
----
2.  app/register/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import {
Eye,
EyeOff,
Mail,
Lock,
User,
ArrowRight,
Sparkles,
CheckCircle2,
} from "lucide-react";
export default function RegisterPage() {
const [showPassword, setShowPassword] = useState(false);
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const requirements = [
{ label: "At least 8 characters", met: password.length >= 8 },
{ label: "One uppercase letter", met: /[A-Z]/.test(password) },
{ label: "One number", met: /[0-9]/.test(password) },
{ label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
];
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
<div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
<div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl" />
  <div className="relative w-full max-w-md">
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
        Create Account
      </h1>
      <p className="text-white/50 mt-2 text-sm">
        Join thousands of professionals finding their dream jobs
      </p>
    </div>

    <div className="glass rounded-3xl p-8 shadow-2xl">
      <form className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-12 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Requirements */}
          <div className="mt-3 space-y-2">
            {requirements.map((req) => (
              <div
                key={req.label}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  req.met ? "text-emerald-400" : "text-white/30"
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    req.met ? "text-emerald-400" : "text-white/20"
                  }`}
                />
                {req.label}
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
          />
          <span className="text-xs text-white/50 leading-relaxed">
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-blue-400 hover:text-blue-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-blue-400 hover:text-blue-300"
            >
              Privacy Policy
            </Link>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
        >
          Create Account
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30 uppercase tracking-wider">
          or continue with
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="h-11 glass rounded-xl flex items-center justify-center gap-2 text-sm text-white/70 hover:bg-white/15 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button className="h-11 glass rounded-xl flex items-center justify-center gap-2 text-sm text-white/70 hover:bg-white/15 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>
    </div>

    <p className="text-center text-sm text-white/40 mt-6">
      Already have an account?{" "}
      <Link
        href="/login"
        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        Sign in
      </Link>
    </p>
  </div>
</div>

);
}
----
3.  app/forgot-password/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
export default function ForgotPasswordPage() {
const [email, setEmail] = useState("");
const [submitted, setSubmitted] = useState(false);
const handleSubmit = (e: React.FormEvent) => {
e.preventDefault();
setSubmitted(true);
};
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
<div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
<div className="absolute -bottom-40 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
  <div className="relative w-full max-w-md">
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
        Reset Password
      </h1>
      <p className="text-white/50 mt-2 text-sm">
        {!submitted
          ? "Enter your email and we'll send you a reset link"
          : "Check your inbox for the reset link"}
      </p>
    </div>

    <div className="glass rounded-3xl p-8 shadow-2xl">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            Send Reset Link
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Email Sent!
          </h3>
          <p className="text-sm text-white/50 mb-6">
            We've sent a password reset link to{" "}
            <span className="text-white/70 font-medium">{email}</span>
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Didn't receive it? Try again
          </button>
        </div>
      )}
    </div>

    <div className="text-center mt-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>
    </div>
  </div>
</div>

);
}
----
4.  app/verify-email/page.tsx
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
----
5.  app/profile/page.tsx
"use client";
import { useState } from "react";
import {
User,
Mail,
MapPin,
Briefcase,
Link as LinkIcon,
Camera,
Save,
Globe,
Github,
Linkedin,
Twitter,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
export default function ProfilePage() {
const [activeTab, setActiveTab] = useState("general");
const tabs = [
{ id: "general", label: "General" },
{ id: "experience", label: "Experience" },
{ id: "skills", label: "Skills" },
{ id: "social", label: "Social" },
];
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
<Navbar />
  <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-white/50 mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar - Avatar Card */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="relative w-28 h-28 mx-auto mb-4">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-white/10 flex items-center justify-center">
                <User className="w-12 h-12 text-white/40" />
              </div>
              <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-white">John Doe</h2>
            <p className="text-sm text-white/50 mb-4">
              Senior Frontend Engineer
            </p>

            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Mail className="w-4 h-4 text-white/30" />
                john@example.com
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <MapPin className="w-4 h-4 text-white/30" />
                San Francisco, CA
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <Briefcase className="w-4 h-4 text-white/30" />
                Open to work
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/50">Profile Completion</span>
                <span className="text-blue-400 font-semibold">85%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                    activeTab === tab.id
                      ? "text-blue-400"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8">
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="john@example.com"
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Headline
                    </label>
                    <input
                      type="text"
                      defaultValue="Senior Frontend Engineer"
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      defaultValue="Passionate frontend engineer with 8+ years of experience building scalable web applications."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        defaultValue="San Francisco, CA"
                        className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        defaultValue="+1 (555) 123-4567"
                        className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "experience" && (
                <div className="space-y-6">
                  {[
                    {
                      role: "Senior Frontend Engineer",
                      company: "TechCorp",
                      period: "2021 - Present",
                    },
                    {
                      role: "Frontend Developer",
                      company: "StartupXYZ",
                      period: "2018 - 2021",
                    },
                  ].map((exp, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white">
                            {exp.role}
                          </h4>
                          <p className="text-sm text-white/50">
                            {exp.company}
                          </p>
                        </div>
                        <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">
                          {exp.period}
                        </span>
                      </div>
                      <p className="text-sm text-white/40">
                        Led frontend development for core product features,
                        improving performance by 40%.
                      </p>
                    </div>
                  ))}
                  <button className="w-full h-11 glass rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-dashed border-white/20">
                    + Add Experience
                  </button>
                </div>
              )}

              {activeTab === "skills" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      "React",
                      "TypeScript",
                      "Next.js",
                      "Tailwind CSS",
                      "Node.js",
                      "GraphQL",
                      "PostgreSQL",
                      "AWS",
                      "Docker",
                      "Figma",
                    ].map((skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                      >
                        {skill}
                      </span>
                    ))}
                    <button className="px-4 py-2 rounded-xl text-sm text-white/40 border border-dashed border-white/20 hover:text-white/60 hover:border-white/30 transition-colors">
                      + Add Skill
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "social" && (
                <div className="space-y-5">
                  {[
                    {
                      icon: Globe,
                      label: "Website",
                      placeholder: "https://yourwebsite.com",
                    },
                    {
                      icon: Github,
                      label: "GitHub",
                      placeholder: "https://github.com/username",
                    },
                    {
                      icon: Linkedin,
                      label: "LinkedIn",
                      placeholder: "https://linkedin.com/in/username",
                    },
                    {
                      icon: Twitter,
                      label: "Twitter",
                      placeholder: "https://twitter.com/username",
                    },
                  ].map((social) => (
                    <div key={social.label}>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        {social.label}
                      </label>
                      <div className="relative">
                        <social.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          type="url"
                          placeholder={social.placeholder}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button className="h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Footer />
</div>

);
}
----
6.  components/footer.tsx
import Link from "next/link";
import { Sparkles, Github, Twitter, Linkedin, Mail } from "lucide-react";
export function Footer() {
const currentYear = new Date().getFullYear();
const footerLinks = {
Product: [
{ label: "Browse Jobs", href: "/jobs" },
{ label: "Pricing", href: "/pricing" },
{ label: "For Employers", href: "#" },
{ label: "API", href: "#" },
],
Company: [
{ label: "About", href: "/about" },
{ label: "Contact", href: "/contact" },
{ label: "Blog", href: "#" },
{ label: "Careers", href: "#" },
],
Legal: [
{ label: "Terms of Service", href: "/terms" },
{ label: "Privacy Policy", href: "/privacy" },
{ label: "Cookie Policy", href: "#" },
],
};
const socialLinks = [
{ icon: Github, href: "#", label: "GitHub" },
{ icon: Twitter, href: "#", label: "Twitter" },
{ icon: Linkedin, href: "#", label: "LinkedIn" },
{ icon: Mail, href: "/contact", label: "Email" },
];
return (
<footer className="relative border-t border-white/10 bg-slate-950/50 backdrop-blur-xl">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
{/* Brand */}
<div className="col-span-2 md:col-span-4 lg:col-span-2">
<Link href="/" className="flex items-center gap-2 mb-4">
<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
<Sparkles className="w-5 h-5 text-white" />
</div>
<span className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
GlobalJob
</span>
</Link>
<p className="text-sm text-white/40 max-w-xs leading-relaxed mb-6">
Connecting top talent with world-class opportunities. Find your
dream job or hire the best professionals globally.
</p>
<div className="flex items-center gap-3">
{socialLinks.map((social) => (
<Link
key={social.label}
href={social.href}
aria-label={social.label}
className="w-9 h-9 rounded-lg glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
>

</Link>
))}
</div>
</div>
      {/* Links */}
      {Object.entries(footerLinks).map(([category, links]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-white/80 mb-4">
            {category}
          </h3>
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/40 hover:text-blue-400 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* Bottom */}
    <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs text-white/30">
        © {currentYear} GlobalJob. All rights reserved.
      </p>
      <div className="flex items-center gap-6">
        <Link
          href="/terms"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Privacy
        </Link>
        <Link
          href="#"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Sitemap
        </Link>
      </div>
    </div>
  </div>
</footer>

);
}
----
7.  app/jobs/[id]/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import {
MapPin,
Briefcase,
DollarSign,
Clock,
Calendar,
Building2,
Globe,
Users,
Share2,
Bookmark,
ChevronLeft,
CheckCircle2,
Sparkles,
Send,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
// Mock data — replace with API call
const job = {
id: 1,
title: "Senior Frontend Engineer",
company: "TechFlow",
logo: "TF",
location: "Remote",
type: "Full-time",
salary: "$120k – $160k",
posted: "2 days ago",
applicants: 48,
experience: "5+ years",
category: "Engineering",
tags: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
description: TechFlow is looking for a Senior Frontend Engineer to join our growing team.  You'll be responsible for building and maintaining our core product features,  working closely with designers and backend engineers to deliver exceptional user experiences.,
responsibilities: [
"Lead frontend architecture decisions and mentor junior developers",
"Build reusable component libraries and design systems",
"Optimize application performance and ensure accessibility standards",
"Collaborate with product and design teams to implement new features",
"Write clean, maintainable, and well-tested code",
],
requirements: [
"5+ years of professional frontend development experience",
"Deep expertise in React, TypeScript, and modern CSS",
"Experience with Next.js and server-side rendering",
"Strong understanding of web performance optimization",
"Excellent communication and teamwork skills",
],
benefits: [
"Competitive salary and equity package",
"Fully remote with flexible hours",
"Health, dental, and vision insurance",
"Annual learning budget of $2,000",
"Unlimited PTO",
"Home office stipend",
],
company: {
name: "TechFlow",
description:
"TechFlow is a fast-growing SaaS company building tools that help teams collaborate more effectively. Founded in 2019, we've grown to 200+ employees across 15 countries.",
size: "200-500 employees",
website: "techflow.io",
industry: "Software",
},
};
export default function JobDetailPage() {
const [saved, setSaved] = useState(false);
const [showApplyModal, setShowApplyModal] = useState(false);
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
<Navbar />
  <div className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
    <div className="max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to jobs
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header Card */}
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl font-bold text-white/80 flex-shrink-0">
                {job.logo}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {job.type}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {job.category}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {job.title}
                </h1>
                <p className="text-white/60 font-medium mb-4">
                  {job.company.name}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {job.salary}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {job.posted}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicants
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => setShowApplyModal(true)}
                className="h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Apply Now
              </button>
              <button
                onClick={() => setSaved(!saved)}
                className={`h-11 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 border ${
                  saved
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "glass text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${saved ? "fill-current" : ""}`}
                />
                {saved ? "Saved" : "Save Job"}
              </button>
              <button className="h-11 px-4 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              About the Role
            </h2>
            <p className="text-white/60 leading-relaxed mb-6">
              {job.description}
            </p>

            <h3 className="text-md font-semibold text-white mb-3">
              Responsibilities
            </h3>
            <ul className="space-y-2 mb-6">
              {job.responsibilities.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/60"
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <h3 className="text-md font-semibold text-white mb-3">
              Requirements
            </h3>
            <ul className="space-y-2 mb-6">
              {job.requirements.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-white/60"
                >
                  <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <h3 className="text-md font-semibold text-white mb-3">
              Benefits
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.benefits.map((benefit, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-sm bg-white/5 text-white/70 border border-white/10"
                >
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">
              Skills & Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Card */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
              About {job.company.name}
            </h3>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              {job.company.description}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/50">
                <Building2 className="w-4 h-4 text-white/30" />
                {job.company.size}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <Globe className="w-4 h-4 text-white/30" />
                {job.company.website}
              </div>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <Briefcase className="w-4 h-4 text-white/30" />
                {job.company.industry}
              </div>
            </div>
            <button className="w-full mt-5 h-10 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors border border-white/10">
              View Company Profile
            </button>
          </div>

          {/* Similar Jobs */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
              Similar Jobs
            </h3>
            <div className="space-y-4">
              {[
                {
                  title: "Frontend Lead",
                  company: "BigTech",
                  location: "Remote",
                },
                {
                  title: "React Developer",
                  company: "StartupXYZ",
                  location: "New York, NY",
                },
                {
                  title: "UI Engineer",
                  company: "DesignCo",
                  location: "San Francisco, CA",
                },
              ].map((j, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {j.title}
                  </h4>
                  <p className="text-xs text-white/40 mt-1">
                    {j.company} • {j.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Footer />

  {/* Apply Modal */}
  {showApplyModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowApplyModal(false)}
      />
      <div className="relative w-full max-w-lg glass rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
        <h2 className="text-xl font-bold text-white mb-2">
          Apply for {job.title}
        </h2>
        <p className="text-sm text-white/50 mb-6">
          at {job.company.name}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Resume / CV
            </label>
            <div className="h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:border-white/20 hover:text-white/50 transition-colors cursor-pointer">
              <Briefcase className="w-6 h-6 mb-2" />
              <span className="text-sm">Drop your resume here or click to upload</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Cover Letter (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Tell us why you're a great fit..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowApplyModal(false)}
            className="flex-1 h-11 glass rounded-xl text-sm text-white/60 hover:bg-white/10 transition-colors border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowApplyModal(false)}
            className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all"
          >
            Submit Application
          </button>
        </div>
      </div>
    </div>
  )}
</div>

);
}
----
Summary of Batch 3 Files
File	Description
1	app/login/page.tsx	Glassmorphism login with social auth, password toggle
2	app/register/page.tsx	Registration with live password strength indicators
3	app/forgot-password/page.tsx	Password reset with success state
4	app/verify-email/page.tsx	Email verification with loading → success flow
5	app/profile/page.tsx	Full profile settings with tabs (General, Experience, Skills, Social)
6	components/footer.tsx	Consistent glassmorphism footer with links & social icons
7	app/jobs/[id]/page.tsx	Job detail page with apply modal, company info, similar jobs
All files use:
•  Dark gradient background (from-slate-950 via-indigo-950 to-slate-900)
•  glass utility class for cards
•  Blue-to-purple gradient buttons with shadows
•  Lucide icons throughout
•  Responsive layouts
Let me know if you need any tweaks before committing!
