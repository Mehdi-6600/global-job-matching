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
    <main className="min-h-screen bg-[#e8eef5] dark:bg-[#1a1d23] flex items-center justify-center py-12 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* کارت نئومورفیک */}
        <div
          className="rounded-[30px] p-10 transition-all duration-300
            bg-[#e8eef5] dark:bg-[#1a1d23]
            shadow-[12px_12px_24px_#c5d0e0,-12px_-12px_24px_#ffffff]
            dark:shadow-[12px_12px_24px_#0f1115,-12px_-12px_24px_#252a33]"
        >
          {/* لوگو */}
          <div className="flex justify-center mb-7">
            <div
              className="w-[84px] h-[84px] rounded-full bg-black flex items-center justify-center 
                border-[5px] border-[#e8eef5] dark:border-[#1a1d23]
                shadow-[6px_6px_12px_#c5d0e0,-6px_-6px_12px_#ffffff]
                dark:shadow-[6px_6px_12px_#0f1115,-6px_-6px_12px_#252a33]
                transition-all duration-300"
            >
              <div className="text-center leading-tight">
                <div className="text-[#00d4ff] font-bold text-[13px]">Global</div>
                <div className="text-gray-400 text-[10px] font-medium">Job Match</div>
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
            <div className="mb-5 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email - فرو رفته */}
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
                className="w-full py-4 px-5 rounded-full outline-none text-[15px] transition-all
                  bg-[#e8eef5] dark:bg-[#1a1d23]
                  text-gray-800 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  shadow-[inset_6px_6px_12px_#c5d0e0,inset_-6px_-6px_12px_#ffffff]
                  dark:shadow-[inset_6px_6px_12px_#0f1115,inset_-6px_-6px_12px_#252a33]
                  focus:shadow-[inset_4px_4px_8px_#c5d0e0,inset_-4px_-4px_8px_#ffffff]
                  dark:focus:shadow-[inset_4px_4px_8px_#0f1115,inset_-4px_-4px_8px_#252a33]"
              />
            </div>

            {/* Password - فرو رفته */}
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
                className="w-full py-4 px-5 rounded-full outline-none text-[15px] transition-all
                  bg-[#e8eef5] dark:bg-[#1a1d23]
                  text-gray-800 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  shadow-[inset_6px_6px_12px_#c5d0e0,inset_-6px_-6px_12px_#ffffff]
                  dark:shadow-[inset_6px_6px_12px_#0f1115,inset_-6px_-6px_12px_#252a33]
                  focus:shadow-[inset_4px_4px_8px_#c5d0e0,inset_-4px_-4px_8px_#ffffff]
                  dark:focus:shadow-[inset_4px_4px_8px_#0f1115,inset_-4px_-4px_8px_#252a33]"
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer select-none">
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

            {/* دکمه Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#3478F5] text-white font-semibold text-[17px]
                transition-all disabled:opacity-70 disabled:cursor-not-allowed
                shadow-[6px_6px_14px_#c5d0e0,-6px_-6px_14px_#ffffff]
                dark:shadow-[6px_6px_14px_#0f1115,-6px_-6px_14px_#252a33]
                hover:bg-[#2a6ae0]
                active:shadow-[inset_4px_4px_8px_#1a5fd9,inset_-4px_-4px_8px_#5B9BF7]
                dark:active:shadow-[inset_4px_4px_8px_#0d47a1,inset_-4px_-4px_8px_#42a5f5]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
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
