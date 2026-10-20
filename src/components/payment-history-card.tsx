"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Receipt } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Tx = {
  id: string;
  planId: string;
  amount: number;
  currency: string;
  cryptoType: string | null;
  txHash: string | null;
  status: string;
  billingCycle: string | null;
  createdAt: string;
};

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed") return "text-[var(--success)] bg-[var(--success-soft)]";
  if (s === "pending") return "text-[var(--warning)] bg-[var(--warning-soft)]";
  if (s === "rejected") return "text-[var(--error)] bg-[var(--error-soft)]";
  return "text-[var(--text-body)] bg-[var(--surface-3)]";
}

export function PaymentHistoryCard() {
  const { t } = useLocale();
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/payments?limit=10", {
          credentials: "include",
        });
        if (res.status === 401) {
          if (!cancelled) setError(t("PaymentHistory.errorSignIn", "Sign in to see payments."));
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(t("PaymentHistory.errorLoad", "Could not load payments."));
          return;
        }
        const json = await res.json();
        if (!cancelled) setItems(json.transactions || []);
      } catch {
        if (!cancelled) setError(t("Common.errorNetwork", "Network error."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-2 text-[var(--text-muted)] border border-[var(--border)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("PaymentHistory.loading", "Loading payments…")}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-[var(--border)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[var(--brand-primary)]" />
          <h3 className="text-[var(--text-primary)] font-semibold">{t("PaymentHistory.title", "Payment history")}</h3>
        </div>
        <Link href="/pricing" className="text-xs text-[var(--brand-primary)] hover:underline">
          {t("PaymentHistory.pricingLink", "Pricing")}
        </Link>
      </div>

      {error && <p className="text-sm text-[var(--text-muted)]">{error}</p>}

      {!error && items.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          {t("PaymentHistory.noPayments", "No payments yet.")}{" "}
          <Link href="/pricing" className="text-[var(--brand-primary)] hover:underline">
            {t("PaymentHistory.upgradePlanLink", "Upgrade a plan")}
          </Link>
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((tx) => (
            <li
              key={tx.id}
              className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--text-primary)] font-medium capitalize">
                  {tx.planId}
                  {tx.billingCycle ? ` · ${tx.billingCycle}` : ""}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${statusClass(
                    tx.status
                  )}`}
                >
                  {t(`PaymentHistory.status${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}`, {
                    confirmed: "Confirmed",
                    pending: "Pending",
                    rejected: "Rejected",
                    unknown: "Unknown",
                  }[tx.status.toLowerCase()] || tx.status)}
                </span>
              </div>
              <div className="mt-1 text-[var(--text-muted)] text-xs flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  {tx.amount} {tx.currency}
                </span>
                {tx.cryptoType && <span>{tx.cryptoType}</span>}
                <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
              </div>
              {tx.txHash && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)] break-all font-mono">
                  {tx.txHash}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
