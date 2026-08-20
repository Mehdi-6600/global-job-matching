// src/app/payment/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PLANS, WALLETS } from "@/lib/payment/plans";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Copy, CheckCircle } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "pro";
  const plan = PLANS.find((p) => p.id === planId);
  const [selectedCurrency, setSelectedCurrency] = useState("USDT-TRC20");
  const [txHash, setTxHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!plan || plan.price === 0) {
    router.push("/pricing");
    return null;
  }

  const walletAddress = WALLETS[selectedCurrency as keyof typeof WALLETS];

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          currency: selectedCurrency,
          walletAddress,
          txHash,
          amount: plan.price,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard?payment=success");
      } else {
        alert(data.error || "خطا در ثبت پرداخت");
      }
    } catch {
      alert("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">تکمیل پرداخت</h1>
      <p className="text-muted-foreground mb-8">
        پلن <strong>{plan.name}</strong> - مبلغ ${plan.price}
      </p>

      <div className="space-y-6">
        {/* انتخاب ارز */}
        <div>
          <label className="block text-sm font-medium mb-2">انتخاب ارز برای پرداخت</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full rounded-md border p-3"
          >
            {Object.keys(WALLETS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        {/* نمایش آدرس کیف پول */}
        <div>
          <label className="block text-sm font-medium mb-2">آدرس کیف پول</label>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-md border">
            <code className="flex-1 text-sm break-all">{walletAddress}</code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            لطفاً دقیقاً به این آدرس پرداخت کنید و هش تراکنش را وارد کنید.
          </p>
        </div>

        {/* فرم وارد کردن هش */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">هش تراکنش (Tx Hash)</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="مثال: 0x1234... یا abcdef..."
              className="w-full rounded-md border p-3"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال تأیید..." : "تأیید پرداخت"}
          </Button>
        </form>
      </div>
    </div>
  );
}
