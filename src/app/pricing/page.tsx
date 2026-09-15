"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale"; // فرض بر وجود این hook یا معادل resolveLocale
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Copy, ExternalLink, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner"; // یا سیستم toast خودت

// Types
type PlanId = "basic" | "pro" | "premium";
type CryptoAsset = "BTC" | "ETH" | "USDT" | "DOGE" | "TRX";

interface Plan {
  id: PlanId;
  nameKey: string;
  priceUsd: number;
  features: string[];
  popular?: boolean;
}

interface PaymentIntentResponse {
  intentId: string;
  asset: CryptoAsset;
  expectedAmount: string; // exact crypto amount as string
  expectedAmountUsd: number;
  recipientAddress: string;
  expiresAt: string;
  network: string;
  qrData?: string;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    nameKey: "pricing.plans.basic.name",
    priceUsd: 9.99,
    features: [
      "pricing.plans.basic.f1",
      "pricing.plans.basic.f2",
      "pricing.plans.basic.f3",
    ],
  },
  {
    id: "pro",
    nameKey: "pricing.plans.pro.name",
    priceUsd: 29.99,
    popular: true,
    features: [
      "pricing.plans.pro.f1",
      "pricing.plans.pro.f2",
      "pricing.plans.pro.f3",
      "pricing.plans.pro.f4",
    ],
  },
  {
    id: "premium",
    nameKey: "pricing.plans.premium.name",
    priceUsd: 79.99,
    features: [
      "pricing.plans.premium.f1",
      "pricing.plans.premium.f2",
      "pricing.plans.premium.f3",
      "pricing.plans.premium.f4",
      "pricing.plans.premium.f5",
    ],
  },
];

const SUPPORTED_ASSETS: { asset: CryptoAsset; network: string; label: string }[] = [
  { asset: "BTC", network: "Bitcoin", label: "Bitcoin (BTC)" },
  { asset: "ETH", network: "Ethereum", label: "Ethereum (ETH)" },
  { asset: "USDT", network: "Ethereum (ERC-20)", label: "USDT (ERC-20)" },
  { asset: "DOGE", network: "Dogecoin", label: "Dogecoin (DOGE)" },
  { asset: "TRX", network: "TRON", label: "TRON (TRX)" },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale } = useLocale(); // فرض: hookی که t() و locale می‌دهد

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>("USDT");
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/pricing`);
    }
  }, [status, router]);

  const createIntent = useCallback(async (planId: PlanId, asset: CryptoAsset) => {
    if (!session?.user?.id) return;

    setLoadingIntent(true);
    setError(null);
    setIntent(null);
    setTxHash("");

    try {
      const res = await fetch("/api/crypto-payment/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, asset }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("pricing.errors.createIntentFailed"));
      }

      setIntent(data);
      setSelectedPlan(planId);
      toast.success(t("pricing.toast.intentCreated"));
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("pricing.errors.generic"));
      toast.error(err.message || t("pricing.errors.generic"));
    } finally {
      setLoadingIntent(false);
    }
  }, [session, t]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("pricing.toast.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("pricing.errors.copyFailed"));
    }
  };

  const handleVerify = async () => {
    if (!intent || !txHash.trim()) {
      toast.error(t("pricing.errors.txHashRequired"));
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/crypto-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentId: intent.intentId,
          txHash: txHash.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("pricing.errors.verifyFailed"));
      }

      toast.success(t("pricing.toast.paymentSuccess"));
      // Redirect to dashboard or success page
      router.push("/dashboard?payment=success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("pricing.errors.verifyFailed"));
      toast.error(err.message || t("pricing.errors.verifyFailed"));
    } finally {
      setVerifying(false);
    }
  };

  const cancelIntent = () => {
    setIntent(null);
    setSelectedPlan(null);
    setTxHash("");
    setError(null);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Intent Active View ───────────────────────────────────────
  if (intent) {
    const expiresIn = Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - Date.now()) / 1000 / 60));

    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t("pricing.intent.title")}</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("pricing.intent.secure")}
              </Badge>
            </div>
            <CardDescription>
              {t("pricing.intent.subtitle", { plan: t(`pricing.plans.${selectedPlan}.name`) })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Amount Box */}
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("pricing.intent.sendExactly")}</p>
              <p className="text-3xl font-bold tracking-tight">
                {intent.expectedAmount} <span className="text-lg font-medium">{intent.asset}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ≈ ${intent.expectedAmountUsd.toFixed(2)} USD
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("pricing.intent.network")}: {intent.network}
              </p>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("pricing.intent.recipient")}</label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all font-mono">
                  {intent.recipientAddress}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(intent.recipientAddress)}
                  title={t("pricing.intent.copy")}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Expiry Warning */}
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {expiresIn > 0
                  ? t("pricing.intent.expiresIn", { minutes: expiresIn })
                  : t("pricing.intent.expired")}
              </span>
            </div>

            {/* TX Hash Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("pricing.intent.txHashLabel")}</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={t("pricing.intent.txHashPlaceholder")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={verifying}
              />
              <p className="text-xs text-muted-foreground">
                {t("pricing.intent.txHashHelp")}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:flex-1"
              onClick={handleVerify}
              disabled={verifying || !txHash.trim() || expiresIn <= 0}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("pricing.intent.verifying")}
                </>
              ) : (
                t("pricing.intent.verifyButton")
              )}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={cancelIntent} disabled={verifying}>
              {t("pricing.intent.cancel")}
            </Button>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("pricing.intent.securityNote")}
        </p>
      </div>
    );
  }

  // ─── Plans Selection View ─────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("pricing.subtitle")}
        </p>
      </div>

      {/* Asset Selector */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {SUPPORTED_ASSETS.map((item) => (
          <Button
            key={item.asset}
            variant={selectedAsset === item.asset ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedAsset(item.asset)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.popular ? "border-primary shadow-lg scale-[1.02]" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3 py-1">{t("pricing.popular")}</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle>{t(plan.nameKey)}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.priceUsd}</span>
                <span className="text-muted-foreground"> / {t("pricing.period")}</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                {plan.features.map((fKey) => (
                  <li key={fKey} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>{t(fKey)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={loadingIntent}
                onClick={() => createIntent(plan.id, selectedAsset)}
              >
                {loadingIntent && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("pricing.creating")}
                  </>
                ) : (
                  t("pricing.selectPlan")
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {error && !intent && (
        <div className="mt-8 mx-auto max-w-md rounded-md bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="mt-12 text-center text-sm text-muted-foreground">
        {t("pricing.footerNote")}
      </p>
    </div>
  );
}
