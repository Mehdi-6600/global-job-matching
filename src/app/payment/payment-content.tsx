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
      <div className="gjm-page flex items-center justify-center px-4 py-16">
        <div className="glass max-w-md w-full p-8 text-center space-y-4 border border-[var(--border)]">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {t("Pricing.free", "Free plan")}
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {t(
              "Pricing.subtitle",
              "No payment required. You can use the free plan from your dashboard."
            )}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-6 py-3 rounded-full text-[var(--text-primary)] font-medium bg-[image:var(--gradient-brand)]"
          >
            {t("Nav.dashboard", "Go to Dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gjm-page flex items-center justify-center px-4 py-16">
      <div className="glass max-w-md w-full p-8 space-y-6 border border-[var(--border)]">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to pricing")}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary-soft)] flex items-center justify-center">
            <Bitcoin className="w-6 h-6 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {t("Pricing.title", "Pay securely")}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {planId.toUpperCase()} · ${amount} USD (
              {isYearly
                ? t("Pricing.yearly", "yearly")
                : t("Pricing.monthly", "monthly")}
              )
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)] flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--warning)]" />
          <p>
            {t(
              "Pricing.subtitle",
              "Card payments are not enabled yet. Please use crypto payment on the pricing page. Your plan activates only after admin verification."
            )}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-[var(--brand-primary)]" />
          <p>
            {t(
              "Common.success",
              "We never store card numbers. Checkout is verified securely."
            )}
          </p>
        </div>

        <Link
          href={`/pricing?plan=${planId}&billing=${isYearly ? "yearly" : "monthly"}`}
          className="flex items-center justify-center w-full py-3 rounded-full font-semibold text-[var(--text-primary)] bg-gradient-to-r bg-[var(--brand-primary)] shadow-lg"
        >
          {t("Pricing.cta", "Continue with crypto on Pricing")}
        </Link>
      </div>
    </div>
  );
}
