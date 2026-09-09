"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bitcoin,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PLAN_PRICES, type PlanId } from "@/lib/payment/plans";
import { useLocale } from "@/components/locale-provider";

export function PaymentContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const planParam = (searchParams.get("plan") || "pro").toLowerCase();
  const billing = (searchParams.get("billing") || "monthly").toLowerCase();

  const planId: PlanId =
    planParam === "business" ||
    planParam === "enterprise" ||
    planParam === "pro" ||
    planParam === "free"
      ? (planParam as PlanId)
      : "pro";

  const monthly = PLAN_PRICES[planId];
  const isYearly = billing === "yearly" || billing === "annual";
  const amount = isYearly ? monthly * 10 : monthly;

  if (planId === "free" || amount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="glass max-w-md w-full p-8 text-center space-y-4 border border-white/10">
          <h1 className="text-xl font-bold text-white">
            {t("Pricing.free", "Free plan")}
          </h1>
          <p className="text-slate-400 text-sm">
            {t(
              "Pricing.subtitle",
              "No payment required. You can use the free plan from your dashboard."
            )}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-6 py-3 rounded-full text-white font-medium bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            {t("Nav.dashboard", "Go to Dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="glass max-w-md w-full p-8 space-y-6 border border-white/10">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to pricing")}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <Bitcoin className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {t("Pricing.title", "Pay securely")}
            </h1>
            <p className="text-sm text-slate-400">
              {planId.toUpperCase()} · ${amount} USD (
              {isYearly
                ? t("Pricing.yearly", "yearly")
                : t("Pricing.monthly", "monthly")}
              )
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <p>
            {t(
              "Pricing.subtitle",
              "Card payments are not enabled yet. Please use crypto payment on the pricing page. Your plan activates only after admin verification."
            )}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-slate-400">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-cyan-400" />
          <p>
            {t(
              "Common.success",
              "We never store card numbers. Checkout is verified securely."
            )}
          </p>
        </div>

        <Link
          href={`/pricing?plan=${planId}&billing=${isYearly ? "yearly" : "monthly"}`}
          className="flex items-center justify-center w-full py-3 rounded-full font-semibold text-white bg-gradient-to-r from-cyan-400 to-cyan-600 shadow-lg"
        >
          {t("Pricing.cta", "Continue with crypto on Pricing")}
        </Link>
      </div>
    </div>
  );
}
