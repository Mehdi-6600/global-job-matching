"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, Sparkles } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to subscribe");
      } else {
        setSuccess(true);
        setEmail("");
        setName("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-8
      bg-white dark:bg-[#151820]
      border border-gray-100 dark:border-[#222733]
      shadow-[0_12px_30px_-6px_rgba(0,0,0,0.12)]
      dark:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#3478F5]/10 dark:bg-[#3478F5]/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#3478F5]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Stay Updated</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Get the best jobs delivered to your inbox weekly</p>
        </div>
      </div>

      {success ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">You are subscribed! Check your inbox soon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-[#2a2f3c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3478F5] text-sm sm:w-40"
          />
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-[#2a2f3c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3478F5] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-[#3478F5] hover:bg-[#2f6de0] disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_8px_20px_-4px_rgba(52,120,245,0.4)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
          </button>
        </form>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-3">{error}</p>
      )}

      <p className="text-gray-400 dark:text-gray-600 text-xs mt-4">No spam. Unsubscribe anytime.</p>
    </div>
  );
}
