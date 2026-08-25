"use client";

import { useState } from "react";
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

const plans = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "For job seekers getting started",
    features: ["Apply to 5 jobs/month", "Basic profile", "Email alerts", "Standard support"],
    icon: <Zap className="w-6 h-6" />,
    color: "from-slate-500 to-slate-400",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: 9, yearly: 90 },
    description: "For active job seekers",
    features: ["Unlimited applications", "Featured profile", "Priority alerts", "Resume review", "Chat support"],
    icon: <Zap className="w-6 h-6" />,
    color: "from-indigo-500 to-purple-500",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: { monthly: 29, yearly: 290 },
    description: "For employers & recruiters",
    features: ["Post 10 jobs/month", "Applicant tracking", "Company profile", "Analytics dashboard", "Priority support"],
    icon: <Building2 className="w-6 h-6" />,
    color: "from-cyan-500 to-blue-500",
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: 99, yearly: 990 },
    description: "For large organizations",
    features: ["Unlimited job posts", "ATS integration", "API access", "Dedicated manager", "Custom branding"],
    icon: <Crown className="w-6 h-6" />,
    color: "from-amber-500 to-orange-500",
    popular: false,
  },
];

const cryptoWallets = [
  { type: "BTC", name: "Bitcoin", address: "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
  { type: "ETH", name: "Ethereum", address: "0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { type: "USDT", name: "USDT (TRC20)", address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cryptoType, setCryptoType] = useState("USDT");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = plans.find((p) => p.id === selectedPlan);

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
          <h1 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>

          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !yearly ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                yearly ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly <span className="text-xs opacity-80">Save 20%</span>
            </button>
          </div>
        </div>

        {!selectedPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`glass rounded-2xl p-6 border transition-all relative ${
                  plan.popular
                    ? "border-indigo-500/30 hover:border-indigo-500/50"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-medium">
                    Most Popular
                  </span>
                )}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-4`}
                >
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    €{yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-slate-500 text-sm">/{yearly ? "year" : "month"}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setSelectedPlan(plan.id)}
                  disabled={plan.id === "free"}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                    plan.id === "free"
                      ? "bg-white/5 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  {plan.id === "free" ? "Current Plan" : "Choose Plan"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => {
                setSelectedPlan(null);
                setSubmitted(false);
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to plans
            </button>

            <div className="glass rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Crypto Payment</h2>
              <p className="text-slate-400 mb-6">
                You selected <span className="text-indigo-400 font-medium">{plan?.name}</span> (
                {yearly ? "Yearly" : "Monthly"})
              </p>

              {!submitted ? (
                <>
                  <div className="space-y-4 mb-6">
                    <label className="block text-sm font-medium text-slate-300">Select Crypto</label>
                    <div className="grid grid-cols-3 gap-3">
                      {cryptoWallets.map((w) => (
                        <button
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
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Send {cryptoType} to:</p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-sm text-slate-300 break-all">
                        {cryptoWallets.find((w) => w.type === cryptoType)?.address}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Amount: €{yearly ? plan?.price.yearly : plan?.price.monthly} equivalent in {cryptoType}
                    </p>
                  </div>

                  <form onSubmit={submitCrypto} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Transaction Hash (TXID)
                      </label>
                      <input
                        type="text"
                        required
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Paste transaction ID here..."
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
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Bitcoin className="w-4 h-4" /> Confirm Payment
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-xs text-slate-500 mt-4 text-center">
                    Your account will be upgraded after manual verification (usually within 24h)
                  </p>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-medium text-white">Payment Submitted!</h3>
                  <p className="text-slate-400 text-sm">
                    We will verify your transaction and upgrade your account soon.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-16 glass rounded-2xl p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "Can I cancel anytime?", a: "Yes, you can cancel or change your plan at any time." },
              { q: "Is crypto payment safe?", a: "Yes, we verify each transaction manually before activating your plan." },
              { q: "What happens after I pay?", a: "Submit your TXID and we will verify it within 24 hours." },
              { q: "Can I switch plans?", a: "Absolutely. You can upgrade or downgrade whenever you want." },
            ].map((item) => (
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
