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
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12] flex items-center justify-center py-10 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* کارت */}
        <div className="rounded-3xl p-8 sm:p-10 
          bg-white dark:bg-[#13151c] 
          border border-gray-200 dark:border-[#1e2330]
          shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]
          transition-all duration-300">
          
          {/* لوگو */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center border-4 border-[#f0f2f5] dark:border-[#0b0d12] shadow-lg">
              <div className="text-center leading-tight">
                <div className="text-[#00d4ff] font-bold text-[13px]">Global</div>
                <div className="text-gray-400 text-[10px]">Job Match</div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-1">
            Sign In
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
            Welcome back to Global Job Matching
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3.5 px-5 rounded-full 
                  bg-[#f0f2f5] dark:bg-[#0b0d12]
                  border border-gray-200 dark:border-[#1e2330]
                  text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                  transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3.5 px-5 rounded-full 
                  bg-[#f0f2f5] dark:bg-[#0b0d12]
                  border border-gray-200 dark:border-[#1e2330]
                  text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                  transition-all"
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-blue-500 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            {/* دکمه */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-[#3478F5] text-white font-semibold text-[16px]
                shadow-lg shadow-blue-500/25
                hover:bg-[#5B9BF7] active:scale-[0.98]
                transition-all disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-blue-500 hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
