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
  Globe,
  Lock,
  QrCode,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { PLAN_PRICES, FEATURED_JOB_PRICES, type PlanId, WALLET_FEE_INFO } from "@/lib/payment/plans";
import { messageFromApiError } from "@/lib/api-error-i18n";

type Wallet = {
  type: string;
  name: string;
  address: string;
  fee?: string;
  chain?: string;
  recommended?: boolean;
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
  const [copiedHash, setCopiedHash] = useState(false);
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [showQr, setShowQr] = useState(false);

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
            list.find((w) => w.type === "BNB") ||
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
          "For job seekers getting started",
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
          "For employers & recruiters",
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
          "For larger hiring needs",
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
    [t],
  );

  const faqs = useMemo(
    () => [
      {
        q: t("Pricing.faq1q", "How does crypto payment work?"),
        a: t(
          "Pricing.faq1a",
          "We create a locked quote with exact crypto amount. Send that amount, paste the transaction hash, and we verify on-chain.",
        ),
      },
      {
        q: t("Pricing.faq2q", "When is my plan activated?"),
        a: t(
          "Pricing.faq2a",
          "After on-chain verification - usually within minutes if you use USDT-TRC20. Manual review within 24h max.",
        ),
      },
      {
        q: t("Pricing.faq3q", "Can I switch plans later?"),
        a: t(
          "Pricing.faq3a",
          "Yes. Submit a new payment for the plan you want; support can adjust your account.",
        ),
      },
      {
        q: t("Pricing.faq4q", "Which cryptocurrencies are accepted?"),
        a: t(
          "Pricing.faq4a",
          "BTC, ETH, BNB, USDT, USDC, DOGE (only those configured by the site). We recommend USDT-TRC20 for lowest fees (~$1).",
        ),
      },
    ],
    [t],
  );

  const plan = plans.find((p) => p.id === selectedPlan) || null;

  const createIntent = useCallback(async () => {
    if (!selectedPlan || selectedPlan === "free") return;
    if (!cryptoType) {
      setError(
        t("Pricing.noWallet", "No payment wallet configured. Please try again later."),
      );
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
              "You already have too many pending quotes. Wait a bit or finish one.",
            ),
          );
        } else if (
          code === "RATE_FETCH_FAILED" ||
          code === "RATE_INVALID" ||
          code === "RATE_STALE"
        ) {
          setError(
            t(
              "Pricing.errRate",
              "Could not fetch live crypto rate. Please try again in a moment.",
            ),
          );
        } else {
          setError(messageFromApiError(res.status, data, t));
        }
        return;
      }

      if (data.intent) {
        setIntent(data.intent);
      } else {
        setError(
          t("Pricing.errCreateIntent", "Could not create payment quote."),
        );
      }
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
    } finally {
      setCreatingIntent(false);
    }
  }, [selectedPlan, cryptoType, yearly, t]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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

        if (code === "TX_FAILED_ON_CHAIN") {
          setError(
            t(
              "Pricing.errTxFailed",
              "This transaction failed on the blockchain or does not match the expected amount/recipient.",
            ),
          );
        } else if (code === "INVALID_TX_HASH") {
          setError(
            t(
              "Pricing.errInvalidHash",
              "Transaction hash format is invalid for the selected crypto.",
            ),
          );
        } else if (code === "DUPLICATE_TX") {
          setError(
            t(
              "Pricing.errDuplicateTx",
              "This transaction hash was already submitted.",
            ),
          );
        } else if (code === "TOO_MANY_PENDING") {
          setError(
            t(
              "Pricing.errTooManyPending",
              "You already have too many pending payments. Wait for admin review.",
            ),
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
              "This payment quote expired or was already used. Please create a new one.",
            ),
          );
          setIntent(null);
        } else if (code === "RECIPIENT_MISMATCH") {
          setError(
            t(
              "Pricing.errRecipient",
              "Wallet address changed. Please create a new quote.",
            ),
          );
          setIntent(null);
        } else {
          setError(messageFromApiError(res.status, data, t));
        }
      } catch {
        setError(
          t("Common.errorNetwork", "Network error. Please try again."),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [intent, txHash, t],
  );

  const copyAddress = useCallback(() => {
    if (!intent?.recipientAddress) return;
    navigator.clipboard.writeText(intent.recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [intent?.recipientAddress]);

  const copyQrData = useCallback(() => {
    if (!intent?.recipientAddress) return;
    // Copy address for easy paste in wallet
    navigator.clipboard.writeText(intent.recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [intent?.recipientAddress]);

  const closeModal = useCallback(() => {
    setSelectedPlan(null);
    setSubmitted(false);
    setError("");
    setIntent(null);
    setTxHash("");
    setShowQr(false);
  }, []);

  const expiresInMinutes = intent
    ? Math.max(
        0,
        Math.floor(
          (new Date(intent.expiresAt).getTime() - Date.now()) / 1000 / 60,
        ),
      )
    : 0;

  const perPeriod = yearly
    ? t("Pricing.perYear", "/year")
    : t("Pricing.perMonth", "/month");

  const selectedWalletFee = WALLET_FEE_INFO[cryptoType];
  const isHighFee = cryptoType === "BTC" || cryptoType === "ETH";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust header for crypto-only */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> No KYC Required
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> On-Chain Verified
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium">
            <Globe className="w-3.5 h-3.5" /> Works Worldwide
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Bitcoin className="w-3.5 h-3.5" /> Crypto Only • No Banks
          </span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t("Pricing.title", "Simple, Transparent Pricing")}
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto mb-3">
            {t(
              "Pricing.subtitle",
              "Choose the plan that fits your needs. Upgrade or downgrade anytime.",
            )}
          </p>
          <p className="text-sm text-indigo-300/80 max-w-xl mx-auto">
            💡 <strong>Why crypto?</strong> Instant, borderless, private. No blocked cards. Perfect for freelancers & global teams.
          </p>

          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 mt-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
                <h3 className="text-xl font-bold text-white mb-1">
                  {p.name}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{p.description}</p>
                <p className="text-3xl font-bold text-white mb-1">
                  ${price}
                  {p.id !== "free" && (
                    <span className="text-sm font-normal text-slate-400">
                      {perPeriod}
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
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <Bitcoin className="w-4 h-4" />
                    {t("Pricing.choose", "Choose plan")}
                  </button>
                )}
                {p.id !== "free" && (
                  <p className="text-[11px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Crypto • No card needed
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Featured job upsell - High conversion for 0-traffic sites */}
        <div className="mb-12 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold mb-3">
                <Star className="w-3.5 h-3.5" /> NEW • FOR EMPLOYERS
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Featured Job Boost — Get 10× More Views
              </h3>
              <p className="text-slate-300 text-sm mb-4 max-w-xl">
                No subscription needed. Pay once with crypto, your job appears on homepage + top of search for 7 or 30 days. Perfect for testing.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Homepage spotlight</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Top of search results</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-bold">FEATURED</span> badge</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 md:w-64 shrink-0">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                <p className="text-xs text-slate-400">7 Days</p>
                <p className="text-2xl font-bold text-white">${FEATURED_JOB_PRICES.weekly}</p>
                <p className="text-xs text-slate-500">one-time in crypto</p>
              </div>
              <div className="rounded-xl bg-amber-500 border border-amber-400 p-4 text-center relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-amber-600 text-[10px] font-bold">BEST VALUE</span>
                <p className="text-xs text-amber-900 font-medium">30 Days</p>
                <p className="text-2xl font-bold text-white">${FEATURED_JOB_PRICES.monthly}</p>
                <p className="text-xs text-amber-100">one-time in crypto</p>
              </div>
              <Link href="/employer/post-job" className="w-full py-2.5 rounded-xl bg-white text-amber-600 font-bold text-sm text-center hover:bg-amber-50 transition flex items-center justify-center gap-1.5">
                Post & Feature Job <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-slate-400 text-center">Pay with USDT • BTC • ETH • BNB</p>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Auto-verified on-chain</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> Active in minutes</span>
          <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-cyan-400" /> No bank needed</span>
          <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-amber-400" /> 180+ countries</span>
        </div>

        {selectedPlan && selectedPlan !== "free" && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="glass w-full max-w-md rounded-2xl p-6 border border-white/10 relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 left-4 text-slate-400 hover:text-white"
                aria-label={t("Common.back", "Back")}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {!submitted ? (
                <>
                  <div className="flex justify-center gap-1.5 mb-2 mt-2">
                    <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SECURE</span>
                    <span className="px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">LOCKED RATE</span>
                  </div>
                  <h2 className="text-xl font-bold text-white text-center mb-1">
                    {t("Pricing.payTitle", "Pay with crypto")}
                  </h2>
                  <p className="text-slate-400 text-sm text-center mb-1">
                    {plan.name} — $
                    {yearly ? plan.price.yearly : plan.price.monthly}
                    {perPeriod}
                  </p>
                  <p className="text-xs text-center text-indigo-300/70 mb-4">🔒 We lock the crypto amount for 30 min - price swings won&apos;t affect you</p>

                  {walletsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : wallets.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-amber-300 text-sm">
                        {t(
                          "Pricing.walletsEmpty",
                          "Crypto wallets are not configured yet. Please log in or contact support.",
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
                        <label
                          htmlFor="pricing-asset"
                          className="block text-xs text-slate-400 mb-1.5"
                        >
                          {t("Pricing.asset", "Asset")} <span className="text-emerald-400">• Low fees first</span>
                        </label>
                        <select
                          id="pricing-asset"
                          value={cryptoType}
                          onChange={(e) => setCryptoType(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                        >
                          {wallets.map((w) => {
                            const feeInfo = WALLET_FEE_INFO[w.type];
                            return (
                              <option key={w.type} value={w.type}>
                                {w.recommended ? "⭐ " : ""}{w.name} ({w.type}) {feeInfo ? `— ${feeInfo.fee} fee` : ""} {w.recommended ? "✓ Recommended" : ""}
                              </option>
                            );
                          })}
                        </select>
                        {selectedWalletFee && (
                          <p className={`text-xs mt-1.5 flex items-center gap-1 ${isHighFee ? "text-amber-300" : "text-emerald-300"}`}>
                            {isHighFee ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            Fee: {selectedWalletFee.fee} — {selectedWalletFee.note}
                            {isHighFee && " — Consider USDT instead!"}
                          </p>
                        )}
                      </div>

                      {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
                      )}

                      <button
                        type="button"
                        onClick={createIntent}
                        disabled={creatingIntent}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {creatingIntent ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("Pricing.creatingQuote", "Creating quote...")}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            {t("Pricing.getQuote", "Get locked quote")} →
                          </>
                        )}
                      </button>

                      <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-3">
                        <p className="text-xs text-slate-400 text-center leading-relaxed">
                          ✓ No credit card • ✓ No KYC • ✓ On-chain verified<br />
                          <span className="text-indigo-300">Average activation: 5-15 minutes with USDT</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4 text-center">
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
                          ≈ ${Number(intent.amountUsd).toFixed(2)} USD <span className="text-xs text-slate-500">via {intent.rateSource || "coingecko"}</span>
                        </p>
                        {isHighFee && (
                          <p className="text-xs text-amber-300 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                            ⚠️ {intent.cryptoType} fees are high. Next time use USDT-TRC20 (~$1 fee)
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="pricing-recipient"
                          className="block text-xs text-slate-400 mb-1.5 flex items-center justify-between"
                        >
                          <span>{t("Pricing.sendTo", "Send payment to")} <span className="text-emerald-400">({intent.cryptoType} — {wallets.find(w=>w.type===intent.cryptoType)?.name || intent.cryptoType})</span></span>
                          <button type="button" onClick={() => setShowQr(!showQr)} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> {showQr ? "Hide QR" : "Show QR"}
                          </button>
                        </label>
                        {showQr && (
                          <div className="flex justify-center p-4 bg-white rounded-xl mb-2">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(intent.recipientAddress)}`}
                              alt="QR Code for payment address"
                              width={160}
                              height={160}
                              className="rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <code
                            id="pricing-recipient"
                            className="flex-1 text-xs text-cyan-300 break-all bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono"
                          >
                            {intent.recipientAddress}
                          </code>
                          <button
                            type="button"
                            onClick={copyAddress}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition"
                            title={t("Common.copy", "Copy")}
                            aria-label={t("Common.copy", "Copy")}
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">⚠️ Send only {intent.cryptoType} to this address. Wrong network = lost funds.</p>
                      </div>

                      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${expiresInMinutes > 5 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : expiresInMinutes > 0 ? "bg-amber-500/5 border-amber-500/20 text-amber-300" : "bg-red-500/5 border-red-500/20 text-red-300"}`}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {expiresInMinutes > 0
                            ? t(
                                "Pricing.expiresIn",
                                "Quote expires in {minutes} min",
                              ).replace(
                                "{minutes}",
                                String(expiresInMinutes),
                              ) + " — send now!"
                            : t(
                                "Pricing.expired",
                                "Quote expired — create a new one",
                              )}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor="pricing-txhash"
                          className="block text-xs text-slate-400 mb-1.5"
                        >
                          {t("Pricing.txHash", "Transaction hash")} <span className="text-slate-500">(after you send)</span>
                        </label>
                        <input
                          id="pricing-txhash"
                          type="text"
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                          placeholder={t(
                            "Pricing.txHashPlaceholder",
                            "Paste TX hash after sending - e.g. 0xabc... or TRON txid",
                          )}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder:text-slate-500"
                          required
                          disabled={expiresInMinutes <= 0}
                        />
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Find it in your wallet app under “Recent Transactions”
                        </p>
                      </div>

                      {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
                      )}

                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          !txHash.trim() ||
                          expiresInMinutes <= 0
                        }
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("Pricing.submitting", "Submitting...")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            {t("Pricing.confirm", "Confirm Payment")} ✓
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIntent(null);
                          setTxHash("");
                          setError("");
                          setShowQr(false);
                        }}
                        className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        {t("Pricing.newQuote", "Create a new quote")} • Change asset
                      </button>
                    </form>
                  )}

                  <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-xs text-slate-400 text-center">
                      <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-400" />
                      {t(
                        "Pricing.verifyNote",
                        "Your account will be upgraded after on-chain verification (usually minutes with USDT, max 24h)",
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {t("Pricing.submittedTitle", "Payment Submitted!")} 🎉
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {t(
                      "Pricing.submittedDesc",
                      "We will verify your transaction and upgrade your account soon.",
                    )}
                  </p>
                  <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-3 text-xs text-slate-400 text-left">
                    <p className="font-medium text-white mb-1">What happens next?</p>
                    <p>• USDT-TRC20: auto-verified in ~5 min → active</p>
                    <p>• BTC/ETH: verified in ~30-60 min</p>
                    <p>• You&apos;ll get an email + notification when active</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                  >
                    {t("Pricing.goDashboard", "Go to Dashboard")} <ArrowRight className="w-4 h-4" />
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
              <div key={item.q} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-medium text-white mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" />{item.q}</h3>
                <p className="text-slate-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400 mb-3">Still have questions?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10">
              Contact Support <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
