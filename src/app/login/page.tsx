"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-[#e8eef5] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* کارت نئومورفیک */}
        <div
          className="rounded-[30px] p-10"
          style={{
            background: "#e8eef5",
            boxShadow: "12px 12px 24px #c5d0e0, -12px -12px 24px #ffffff",
          }}
        >
          {/* لوگو */}
          <div className="flex justify-center mb-7">
            <div
              className="w-[84px] h-[84px] rounded-full bg-black flex items-center justify-center border-[5px] border-[#e8eef5]"
              style={{
                boxShadow: "6px 6px 12px #c5d0e0, -6px -6px 12px #ffffff",
              }}
            >
              <div className="text-center leading-tight">
                <div className="text-[#00d4ff] font-bold text-[13px]">Global</div>
                <div className="text-gray-400 text-[10px] font-medium">Job Match</div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
            Sign In
          </h1>
          <p className="text-center text-gray-500 text-sm mb-8">
            Welcome back to Global Job Matching
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email - فرو رفته */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-4 px-5 rounded-full bg-[#e8eef5] text-gray-800 outline-none text-[15px]
                  placeholder:text-gray-400 transition-all"
                style={{
                  boxShadow: "inset 6px 6px 12px #c5d0e0, inset -6px -6px 12px #ffffff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 4px 4px 8px #c5d0e0, inset -4px -4px 8px #ffffff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 6px 6px 12px #c5d0e0, inset -6px -6px 12px #ffffff";
                }}
              />
            </div>

            {/* Password - فرو رفته */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-4 px-5 rounded-full bg-[#e8eef5] text-gray-800 outline-none text-[15px]
                  placeholder:text-gray-400 transition-all"
                style={{
                  boxShadow: "inset 6px 6px 12px #c5d0e0, inset -6px -6px 12px #ffffff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 4px 4px 8px #c5d0e0, inset -4px -4px 8px #ffffff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow =
                    "inset 6px 6px 12px #c5d0e0, inset -6px -6px 12px #ffffff";
                }}
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-[#3478F5] rounded"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-[#3478F5] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* دکمه Sign In - برجسته */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#3478F5] text-white font-semibold text-[17px]
                transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                boxShadow: "6px 6px 14px #c5d0e0, -6px -6px 14px #ffffff",
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow =
                    "inset 4px 4px 8px #1a5fd9, inset -4px -4px 8px #5B9BF7";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.boxShadow =
                  "6px 6px 14px #c5d0e0, -6px -6px 14px #ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "6px 6px 14px #c5d0e0, -6px -6px 14px #ffffff";
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[#3478F5] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
