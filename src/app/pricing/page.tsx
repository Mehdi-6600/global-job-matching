"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { PLAN_PRICES, type PlanId } from "@/lib/payment/plans";

type Wallet = {
  type: string;
  name: string;
  address: string;
};

type PaymentIntent = {
  id: string;
  planId: string;
  billingCycle: string;
  amountUsd: number;
  cryptoType: string;
  expectedCryptoAmount: number | string;
  rateUsd: number | string;
  rateSource?: string;
  recipientAddress: string;
  expiresAt: string;
  status: string;
};

export default function PricingPage() {
  const { t } = useLocale();
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [cryptoType, setCryptoType] = useState<string>("USDT");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWalletsLoading(true);
    fetch("/api/crypto-payment")
      .then(async (res) => {
        if (res.status === 401) {
          return { wallets: [] as Wallet[] };
        }
        return res.json().catch(() => ({ wallets: [] }));
      })
      .then((data) => {
        if (cancelled) return;
        const list: Wallet[] = Array.isArray(data.wallets) ? data.wallets : [];
        setWallets(list);
        if (list.length > 0) {
          const prefer =
            list.find((w) => w.type === "USDT") ||
            list.find((w) => w.type === "USDC") ||
            list[0];
          setCryptoType(prefer.type);
        }
      })
      .catch(() => {
        if (!cancelled) setWallets([]);
      })
      .finally(() => {
        if (!cancelled) setWalletsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          t("Pricing.freeF1", "Up to 20 applications / month"),
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
          t("Pricing.proF1", "Up to 500 applications / month"),
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
          t("Pricing.bizF1", "Up to 10 active job posts"),
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
          t("Pricing.entF1", "Up to 50 active job posts"),
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
          "We create a locked quote with exact crypto amount. Send that amount, paste the transaction hash, and we verify on-chain."
        ),
      },
      {
        q: t("Pricing.faq2q", "When is my plan activated?"),
        a: t(
          "Pricing.faq2a",
          "After an admin confirms your on-chain transaction (usually within 24 hours)."
        ),
      },
      {
        q: t("Pricing.faq3q", "Can I switch plans later?"),
        a: t(
          "Pricing.faq3a",
          "Yes. Submit a new payment for the plan you want; support can adjust your account."
        ),
      },
      {
        q: t("Pricing.faq4q", "Which cryptocurrencies are accepted?"),
        a: t(
          "Pricing.faq4a",
          "BTC, ETH, BNB, USDT, USDC, DOGE (only those configured by the site)."
        ),
      },
    ],
    [t]
  );

  const plan = plans.find((p) => p.id === selectedPlan) || null;

  const createIntent = useCallback(async () => {
    if (!selectedPlan || selectedPlan === "free") return;
    if (!cryptoType) {
      setError(t("Pricing.noWallet", "No payment wallet configured."));
      return;
    }

    setCreatingIntent(true);
    setError("");
    setIntent(null);
    setTxHash("");

    try {
      const res = await fetch("/api/crypto-payment/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          cryptoType,
          billing: yearly ? "yearly" : "monthly",
        }),
      });

      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/pricing";
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : "";
        if (code === "TOO_MANY_INTENTS") {
          setError(
            t(
              "Pricing.errTooManyPending",
              "You already have too many pending quotes. Wait a bit or finish one."
            )
          );
        } else if (
          code === "RATE_FETCH_FAILED" ||
          code === "RATE_INVALID" ||
          code === "RATE_STALE"
        ) {
          setError(
            t(
              "Pricing.errRate",
              "Could not fetch live crypto rate. Please try again in a moment."
            )
          );
        } else {
          setError(
            data.error ||
              t("Pricing.errCreateIntent", "Could not create payment quote.")
          );
        }
        return;
      }

      if (data.intent) {
        setIntent(data.intent);
      } else {
        setError(t("Pricing.errCreateIntent", "Could not create payment quote."));
      }
    } catch {
      setError(t("Common.errorNetwork", "Network error. Please try again."));
    } finally {
      setCreatingIntent(false);
    }
  }, [selectedPlan, cryptoType, yearly, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intent || !txHash.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/crypto-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: intent.id,
          txHash: txHash.trim(),
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
        return;
      }

      const code = typeof data.code === "string" ? data.code : "";
      const serverMsg = typeof data.error === "string" ? data.error : "";

      if (code === "TX_FAILED_ON_CHAIN") {
        setError(
          t(
            "Pricing.errTxFailed",
            "This transaction failed on the blockchain or does not match the expected amount/recipient."
          )
        );
      } else if (code === "INVALID_TX_HASH") {
        setError(
          t(
            "Pricing.errInvalidHash",
            "Transaction hash format is invalid for the selected crypto."
          )
        );
      } else if (code === "DUPLICATE_TX") {
        setError(
          t(
            "Pricing.errDuplicateTx",
            "This transaction hash was already submitted."
          )
        );
      } else if (code === "TOO_MANY_PENDING") {
        setError(
          t(
            "Pricing.errTooManyPending",
            "You already have too many pending payments. Wait for admin review."
          )
        );
      } else if (
        code === "INTENT_EXPIRED" ||
        code === "INTENT_INVALID" ||
        code === "ILLEGAL_INTENT_TRANSITION" ||
        code === "INTENT_ALREADY_USED"
      ) {
        setError(
          t(
            "Pricing.errIntentExpired",
            "This payment quote expired or was already used. Please create a new one."
          )
        );
        setIntent(null);
      } else if (code === "RECIPIENT_MISMATCH") {
        setError(
          t(
            "Pricing.errRecipient",
            "Wallet address changed. Please create a new quote."
          )
        );
        setIntent(null);
      } else if (res.status === 429) {
        setError(
          t(
            "Auth.errors.rateLimited",
            "Too many requests. Please wait a minute and try again."
          )
        );
      } else {
        setError(
          serverMsg ||
            t("Pricing.errSubmit", "Submission failed. Please try again.")
        );
      }
    } catch {
      setError(t("Common.errorNetwork", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function copyAddress() {
    if (!intent?.recipientAddress) return;
    navigator.clipboard.writeText(intent.recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeModal() {
    setSelectedPlan(null);
    setSubmitted(false);
    setError("");
    setIntent(null);
    setTxHash("");
  }

  const expiresInMinutes = intent
    ? Math.max(
        0,
        Math.floor(
          (new Date(intent.expiresAt).getTime() - Date.now()) / 1000 / 60
        )
      )
    : 0;

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
              {t("Pricing.yearly", "Yearly")}
              <span className="ml-1 text-xs text-emerald-400">
                {t("Pricing.save", "save ~2 mo")}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((p) => {
            const price = yearly ? p.price.yearly : p.price.monthly;
            return (
              <div
                key={p.id}
                className={`glass rounded-2xl p-6 border transition-all relative ${
                  p.popular
                    ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : "border-white/10"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-medium">
                    {t("Pricing.popular", "Popular")}
                  </span>
                )}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4`}
                >
                  {p.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{p.description}</p>
                <p className="text-3xl font-bold text-white mb-1">
                  ${price}
                  {p.id !== "free" && (
                    <span className="text-sm font-normal text-slate-400">
                      /{yearly ? "yr" : "mo"}
                    </span>
                  )}
                </p>
                <ul className="space-y-2 my-6">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.id === "free" ? (
                  <Link
                    href="/register"
                    className="block w-full text-center py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    {t("Pricing.getStarted", "Get started")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(p.id);
                      setSubmitted(false);
                      setError("");
                      setIntent(null);
                      setTxHash("");
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
                  >
                    {t("Pricing.choose", "Choose plan")}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedPlan && selectedPlan !== "free" && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="glass w-full max-w-md rounded-2xl p-6 border border-white/10 relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 left-4 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {!submitted ? (
                <>
                  <h2 className="text-xl font-bold text-white text-center mb-1">
                    {t("Pricing.payTitle", "Pay with crypto")}
                  </h2>
                  <p className="text-slate-400 text-sm text-center mb-6">
                    {plan.name} — $
                    {yearly ? plan.price.yearly : plan.price.monthly}
                    /{yearly ? "year" : "month"}
                  </p>

                  {walletsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : wallets.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-amber-300 text-sm">
                        {t(
                          "Pricing.walletsEmpty",
                          "Crypto wallets are not configured yet. Please log in or contact support."
                        )}
                      </p>
                      <Link
                        href="/login?callbackUrl=/pricing"
                        className="inline-flex text-cyan-400 text-sm hover:underline"
                      >
                        {t("Pricing.login", "Sign in")}
                      </Link>
                    </div>
                  ) : !intent ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          {t("Pricing.asset", "Asset")}
                        </label>
                        <select
                          value={cryptoType}
                          onChange={(e) => setCryptoType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                        >
                          {wallets.map((w) => (
                            <option key={w.type} value={w.type}>
                              {w.name} ({w.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {error && (
                        <p className="text-sm text-red-400">{error}</p>
                      )}

                      <button
                        type="button"
                        onClick={createIntent}
                        disabled={creatingIntent}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {creatingIntent ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("Pricing.creatingQuote", "Creating quote...")}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            {t("Pricing.getQuote", "Get locked quote")}
                          </>
                        )}
                      </button>

                      <p className="text-xs text-slate-500 text-center">
                        {t(
                          "Pricing.quoteNote",
                          "We lock the exact crypto amount for 30 minutes so price changes cannot affect your payment."
                        )}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                        <p className="text-xs text-slate-400 mb-1">
                          {t("Pricing.sendExactly", "Send exactly")}
                        </p>
                        <p className="text-2xl font-bold text-white tracking-tight">
                          {intent.expectedCryptoAmount}{" "}
                          <span className="text-base font-medium text-indigo-300">
                            {intent.cryptoType}
                          </span>
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          ≈ ${Number(intent.amountUsd).toFixed(2)} USD
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          {t("Pricing.sendTo", "Send payment to")}
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-cyan-300 break-all bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            {intent.recipientAddress}
                          </code>
                          <button
                            type="button"
                            onClick={copyAddress}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                            title="Copy"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-amber-300/90">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {expiresInMinutes > 0
                            ? t("Pricing.expiresIn", "Quote expires in {minutes} min").replace(
                                "{minutes}",
                                String(expiresInMinutes)
                              )
                            : t("Pricing.expired", "Quote expired — create a new one")}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          {t("Pricing.txHash", "Transaction hash")}
                        </label>
                        <input
                          type="text"
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                          placeholder={t(
                            "Pricing.txHashPlaceholder",
                            "Paste TX hash after sending"
                          )}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono"
                          required
                          disabled={expiresInMinutes <= 0}
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-400">{error}</p>
                      )}

                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          !txHash.trim() ||
                          expiresInMinutes <= 0
                        }
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
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

                      <button
                        type="button"
                        onClick={() => {
                          setIntent(null);
                          setTxHash("");
                          setError("");
                        }}
                        className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        {t("Pricing.newQuote", "Create a new quote")}
                      </button>
                    </form>
                  )}

                  <p className="text-xs text-slate-500 mt-4 text-center">
                    {t(
                      "Pricing.verifyNote",
                      "Your account will be upgraded after admin confirmation of the on-chain payment (usually within 24h)"
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
