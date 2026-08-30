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

const cryptoWallets = [
  {
    type: "BTC",
    name: "Bitcoin",
    address: "bc1qd8pz8kh8ghh5dzlz4y5t8fgzyhe6y8y67j33m3",
  },
  {
    type: "ETH",
    name: "Ethereum",
    address: "0x0CAF488206AC367C37Cd6a56C71d9b1BC9D7Be5c",
  },
  {
    type: "BNB",
    name: "BNB (BSC)",
    address: "bnb1da7gyaynhqwz3yf6aq5u2x4vy2k6c5futd84z5",
  },
  {
    type: "USDT",
    name: "USDT (TRC20)",
    address: "TU3QBM4VnypRobQHh1w1n7QXdFQ8yPqRex",
  },
  {
    type: "DOGE",
    name: "Dogecoin",
    address: "DJyuoTooAZYdC8NPpuAbUBKhjmeoWSBnFS",
  },
  {
    type: "TON",
    name: "TON",
    address: "UQDol0GBbL3km5-9F4rEQO8UQnUo6XJbsG_LwBcG_6cPs1oh",
  },
];

export default function PricingPage() {
  const { t } = useLocale();
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cryptoType, setCryptoType] = useState("USDT");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const plans = useMemo(
    () => [
      {
        id: "free",
        name: t("Pricing.planFree", "Free"),
        price: { monthly: 0, yearly: 0 },
        description: t(
          "Pricing.planFreeDesc",
          "For job seekers getting started"
        ),
        features: [
          t("Pricing.freeF1", "Apply to 5 jobs/month"),
          t("Pricing.freeF2", "Basic profile"),
          t("Pricing.freeF3", "Email alerts"),
          t("Pricing.freeF4", "Standard support"),
        ],
        icon: <Zap className="w-6 h-6" />,
        color: "from-slate-500 to-slate-400",
        popular: false,
      },
      {
        id: "pro",
        name: t("Pricing.planPro", "Pro"),
        price: { monthly: 9, yearly: 90 },
        description: t("Pricing.planProDesc", "For active job seekers"),
        features: [
          t("Pricing.proF1", "Unlimited applications"),
          t("Pricing.proF2", "Featured profile"),
          t("Pricing.proF3", "Priority alerts"),
          t("Pricing.proF4", "Resume review"),
          t("Pricing.proF5", "Chat support"),
        ],
        icon: <Zap className="w-6 h-6" />,
        color: "from-indigo-500 to-purple-500",
        popular: true,
      },
      {
        id: "business",
        name: t("Pricing.planBusiness", "Business"),
        price: { monthly: 29, yearly: 290 },
        description: t(
          "Pricing.planBusinessDesc",
          "For employers & recruiters"
        ),
        features: [
          t("Pricing.bizF1", "Post 10 jobs/month"),
          t("Pricing.bizF2", "Applicant tracking"),
          t("Pricing.bizF3", "Company profile"),
          t("Pricing.bizF4", "Analytics dashboard"),
          t("Pricing.bizF5", "Priority support"),
        ],
        icon: <Building2 className="w-6 h-6" />,
        color: "from-cyan-500 to-blue-500",
        popular: false,
      },
      {
        id: "enterprise",
        name: t("Pricing.planEnterprise", "Enterprise"),
        price: { monthly: 99, yearly: 990 },
        description: t(
          "Pricing.planEnterpriseDesc",
          "For large organizations"
        ),
        features: [
          t("Pricing.entF1", "Unlimited job posts"),
          t("Pricing.entF2", "ATS integration"),
          t("Pricing.entF3", "API access"),
          t("Pricing.entF4", "Dedicated manager"),
          t("Pricing.entF5", "Custom branding"),
        ],
        icon: <Crown className="w-6 h-6" />,
        color: "from-amber-500 to-orange-500",
        popular: false,
      },
    ],
    [t]
  );

  const plan = plans.find((p) => p.id === selectedPlan);

  const faqs = [
    {
      q: t("Pricing.faq1q", "Can I cancel anytime?"),
      a: t(
        "Pricing.faq1a",
        "Yes, you can cancel or change your plan at any time."
      ),
    },
    {
      q: t("Pricing.faq2q", "Is crypto payment safe?"),
      a: t(
        "Pricing.faq2a",
        "Yes, we verify each transaction manually before activating your plan."
      ),
    },
    {
      q: t("Pricing.faq3q", "What happens after I pay?"),
      a: t(
        "Pricing.faq3a",
        "Submit your TXID and we will verify it within 24 hours."
      ),
    },
    {
      q: t("Pricing.faq4q", "Can I switch plans?"),
      a: t(
        "Pricing.faq4a",
        "Absolutely. You can upgrade or downgrade whenever you want."
      ),
    },
  ];

  async function submitCrypto(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !txHash.trim()) return;

    setSubmitting(true);
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

      if (res.ok) {
        setSubmitted(true);
        setTxHash("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function copyAddress() {
    const wallet = cryptoWallets.find((w) => w.type === cryptoType);
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
                {t("Pricing.save20", "Save 20%")}
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
                    €{yearly ? p.price.yearly : p.price.monthly}
                  </span>
                  <span className="text-slate-500 text-sm">
                    /{yearly ? t("Pricing.perYear", "year") : t("Pricing.perMonth", "month")}
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
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {p.id === "free"
                    ? t("Pricing.currentPlan", "Current Plan")
                    : t("Pricing.choosePlan", "Choose Plan")}
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
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Pricing.backToPlans", "Back to plans")}
            </button>

            <div className="glass rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">
                {t("Pricing.cryptoTitle", "Crypto Payment")}
              </h2>
              <p className="text-slate-400 mb-6">
                {t("Pricing.youSelected", "You selected")}{" "}
                <span className="text-indigo-400 font-medium">
                  {plan?.name}
                </span>{" "}
                (
                {yearly
                  ? t("Pricing.yearly", "Yearly")
                  : t("Pricing.monthly", "Monthly")}
                )
              </p>

              {!submitted ? (
                <>
                  <div className="space-y-4 mb-6">
                    <label className="block text-sm font-medium text-slate-300">
                      {t("Pricing.selectCrypto", "Select Crypto")}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {cryptoWallets.map((w) => (
                        <button
                          type="button"
                          key={w.type}
                          onClick={() => setCryptoType(w.type)}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                            cryptoType === w.type
                              ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                              : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {w.type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                      {t("Pricing.sendTo", "Send")} {cryptoType}{" "}
                      {t("Pricing.to", "to")}:
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-sm text-slate-300 break-all">
                        {
                          cryptoWallets.find((w) => w.type === cryptoType)
                            ?.address
                        }
                      </code>
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {t("Pricing.amount", "Amount")}: €
                      {yearly ? plan?.price.yearly : plan?.price.monthly}{" "}
                      {t("Pricing.equivalent", "equivalent in")} {cryptoType}
                    </p>
                  </div>

                  <form onSubmit={submitCrypto} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {t("Pricing.txHash", "Transaction Hash (TXID)")}
                      </label>
                      <input
                        type="text"
                        required
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder={t(
                          "Pricing.txPlaceholder",
                          "Paste transaction ID here..."
                        )}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-all flex items-center justify-center gap-2"
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
