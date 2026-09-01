"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Building2,
  Crown,
  Bitcoin,
  Loader2,
  Copy,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import {
  PLAN_PRICES,
  CRYPTO_WALLETS,
  type PlanId,
} from "@/lib/payment/plans";

export default function PricingPage() {
  const { t } = useLocale();
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [cryptoType, setCryptoType] = useState<string>(
    CRYPTO_WALLETS[3]?.type || "USDT"
  );
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const plans = useMemo(
    () => [
      {
        id: "free" as const,
        name: t("Pricing.planFree", "Free"),
        price: {
          monthly: PLAN_PRICES.free,
          yearly: PLAN_PRICES.free,
        },
        description: t(
          "Pricing.planFreeDesc",
          "For job seekers getting started"
        ),
        features: [
          t("Pricing.freeF1", "Browse and apply to jobs"),
          t("Pricing.freeF2", "Basic profile"),
          t("Pricing.freeF3", "Email alerts"),
          t("Pricing.freeF4", "Standard support"),
        ],
        icon: <Zap className="w-6 h-6" />,
        color: "from-slate-500 to-slate-400",
        popular: false,
      },
      {
        id: "pro" as const,
        name: t("Pricing.planPro", "Pro"),
        price: {
          monthly: PLAN_PRICES.pro,
          yearly: PLAN_PRICES.pro * 10,
        },
        description: t("Pricing.planProDesc", "For active job seekers"),
        features: [
          t("Pricing.proF1", "Unlimited applications"),
          t("Pricing.proF2", "AI resume tools"),
          t("Pricing.proF3", "Career risk insights"),
          t("Pricing.proF4", "Priority alerts"),
          t("Pricing.proF5", "Chat support"),
        ],
        icon: <Zap className="w-6 h-6" />,
        color: "from-indigo-500 to-purple-500",
        popular: true,
      },
      {
        id: "business" as const,
        name: t("Pricing.planBusiness", "Business"),
        price: {
          monthly: PLAN_PRICES.business,
          yearly: PLAN_PRICES.business * 10,
        },
        description: t(
          "Pricing.planBusinessDesc",
          "For employers & recruiters"
        ),
        features: [
          t("Pricing.bizF1", "Post jobs"),
          t("Pricing.bizF2", "Applicant tracking"),
          t("Pricing.bizF3", "Company profile"),
          t("Pricing.bizF4", "Email outreach tools"),
          t("Pricing.bizF5", "Priority support"),
        ],
        icon: <Building2 className="w-6 h-6" />,
        color: "from-cyan-500 to-blue-500",
        popular: false,
      },
      {
        id: "enterprise" as const,
        name: t("Pricing.planEnterprise", "Enterprise"),
        price: {
          monthly: PLAN_PRICES.enterprise,
          yearly: PLAN_PRICES.enterprise * 10,
        },
        description: t(
          "Pricing.planEnterpriseDesc",
          "For larger hiring needs"
        ),
        features: [
          t("Pricing.entF1", "Everything in Business"),
          t("Pricing.entF2", "Advanced analytics"),
          t("Pricing.entF3", "Custom limits"),
          t("Pricing.entF4", "Dedicated support"),
        ],
        icon: <Crown className="w-6 h-6" />,
        color: "from-amber-500 to-orange-500",
        popular: false,
      },
    ],
    [t]
  );

  const faqs = useMemo(
    () => [
      {
        q: t("Pricing.faq1q", "How does crypto payment work?"),
        a: t(
          "Pricing.faq1a",
          "Send the plan amount to the wallet, paste the transaction hash, and we verify within 24 hours."
        ),
      },
      {
        q: t("Pricing.faq2q", "Can I change plans later?"),
        a: t(
          "Pricing.faq2a",
          "Yes. Contact support or submit a new payment for a higher plan."
        ),
      },
      {
        q: t("Pricing.faq3q", "Is the free plan really free?"),
        a: t(
          "Pricing.faq3a",
          "Yes. You can browse and apply without paying."
        ),
      },
      {
        q: t("Pricing.faq4q", "Which cryptocurrencies are accepted?"),
        a: t(
          "Pricing.faq4a",
          "BTC, ETH, BNB, USDT, USDC, DOGE, and TON."
        ),
      },
    ],
    [t]
  );

  const plan = plans.find((p) => p.id === selectedPlan) || null;
  const selectedWallet =
    CRYPTO_WALLETS.find((w) => w.type === cryptoType) || CRYPTO_WALLETS[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || plan.id === "free" || !txHash.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/crypto-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          amount: yearly ? plan.price.yearly : plan.price.monthly,
          currency: "USD",
          txHash: txHash.trim(),
          cryptoType,
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/pricing";
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
        setTxHash("");
      } else {
        setError(data.error || "Submission failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function copyAddress() {
    if (!selectedWallet) return;
    navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t("Pricing.title", "Simple, Transparent Pricing")}
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            {t(
              "Pricing.subtitle",
              "Choose the plan that fits your needs. Upgrade or downgrade anytime."
            )}
          </p>

          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !yearly
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("Pricing.monthly", "Monthly")}
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                yearly
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("Pricing.yearly", "Yearly")}{" "}
              <span className="text-xs opacity-80">
                {t("Pricing.save20", "Save ~17%")}
              </span>
            </button>
          </div>
        </div>

        {!selectedPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`glass rounded-2xl p-6 border transition-all relative ${
                  p.popular
                    ? "border-indigo-500/30 hover:border-indigo-500/50"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium">
                    {t("Pricing.popular", "Most Popular")}
                  </span>
                )}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4`}
                >
                  {p.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{p.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    ${yearly ? p.price.yearly : p.price.monthly}
                  </span>
                  <span className="text-slate-500 text-sm">
                    /
                    {yearly
                      ? t("Pricing.perYear", "year")
                      : t("Pricing.perMonth", "month")}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {p.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  disabled={p.id === "free"}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                    p.id === "free"
                      ? "bg-white/5 text-slate-500 cursor-not-allowed"
                      : p.popular
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {p.id === "free"
                    ? t("Pricing.current", "Current plan")
                    : t("Pricing.choose", "Choose plan")}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedPlan(null);
                setSubmitted(false);
                setError("");
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Pricing.back", "Back to plans")}
            </button>

            <div className="glass rounded-2xl p-6 border border-white/10">
              {!submitted ? (
                <>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {t("Pricing.payTitle", "Pay with crypto")}
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    {plan?.name} — $
                    {yearly ? plan?.price.yearly : plan?.price.monthly} USD
                  </p>

                  <label className="block text-sm text-slate-400 mb-2">
                    {t("Pricing.selectCrypto", "Cryptocurrency")}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {CRYPTO_WALLETS.map((w) => (
                      <button
                        key={w.type}
                        type="button"
                        onClick={() => setCryptoType(w.type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          cryptoType === w.type
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        {w.type}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500 mb-1">
                    {selectedWallet?.name} {t("Pricing.address", "address")}
                  </p>
                  <div className="flex items-center gap-2 mb-6">
                    <code className="flex-1 text-xs text-cyan-300 bg-black/30 rounded-lg px-3 py-2 break-all border border-white/10">
                      {selectedWallet?.address}
                    </code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                      title="Copy"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        {t("Pricing.txHash", "Transaction hash")}
                      </label>
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        required
                        minLength={10}
                        placeholder="0x... or tx id"
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || txHash.trim().length < 10}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("Pricing.submitting", "Submitting...")}
                        </>
                      ) : (
                        <>
                          <Bitcoin className="w-4 h-4" />
                          {t("Pricing.confirm", "Confirm Payment")}
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-xs text-slate-500 mt-4 text-center">
                    {t(
                      "Pricing.verifyNote",
                      "Your account will be upgraded after manual verification (usually within 24h)"
                    )}
                  </p>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-medium text-white">
                    {t("Pricing.submittedTitle", "Payment Submitted!")}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {t(
                      "Pricing.submittedDesc",
                      "We will verify your transaction and upgrade your account soon."
                    )}
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                  >
                    {t("Pricing.goDashboard", "Go to Dashboard")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-16 glass rounded-2xl p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {t("Pricing.faqTitle", "Frequently Asked Questions")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((item) => (
              <div key={item.q}>
                <h3 className="font-medium text-white mb-1">{item.q}</h3>
                <p className="text-slate-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
