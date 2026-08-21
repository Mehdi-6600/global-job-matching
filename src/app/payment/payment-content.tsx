"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function PaymentContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "pro";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const plans: Record<string, { name: string; price: string; period: string }> = {
    free: { name: "Free", price: "$0", period: "forever" },
    pro: { name: "Pro", price: "$19", period: "per month" },
    enterprise: { name: "Enterprise", price: "Custom", period: "contact us" },
  };

  const selected = plans[plan] || plans.pro;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 flex items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-md text-center">
          <div className="glass rounded-3xl p-10 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-500 dark:text-white/50 mb-8">
              Thank you for subscribing to {selected.name}. Your account has been upgraded.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 right-20 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-md mx-auto">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to pricing
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-100 dark:to-purple-200 bg-clip-text text-transparent">
            Complete Payment
          </h1>
          <p className="text-slate-500 dark:text-white/50 mt-2">
            You are subscribing to the <span className="font-semibold text-slate-700 dark:text-white/80">{selected.name}</span> plan
          </p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl mb-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-black/5 dark:border-white/10">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selected.name} Plan
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50">{selected.period}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{selected.price}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Card Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30" />
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  Expiry
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full h-12 px-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                  CVC
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full h-12 px-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                Name on Card
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full h-12 px-4 rounded-xl bg-white/50 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Pay {selected.price}
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-white/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secured by Stripe-level encryption</span>
        </div>
      </div>
    </div>
  );
}
