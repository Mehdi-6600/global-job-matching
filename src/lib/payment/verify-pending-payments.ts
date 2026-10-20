import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { verifyTxOnChain } from "@/lib/payment/verify-crypto";
import { securityLog } from "@/lib/security-log";
import { activatePlanForUser, type BillingCycle } from "@/lib/subscription";

/**
 * Core of the crypto payment sweep: look at pending crypto transactions, ask the
 * chain whether they were paid, and activate the plan / feature the job when
 * they were.
 *
 * Extracted from the cron route so it can be driven from two places:
 *   - `GET /api/cron/verify-payments` (Vercel daily cron + GitHub Actions)
 *   - the in-app scheduler (src/lib/payment/sweep-scheduler.ts), which runs it
 *     at most once every 10 minutes because the Hobby plan only allows daily
 *     cron jobs.
 *
 * Fail-closed by design: a transaction that cannot be verified on-chain stays
 * pending for manual admin review. Nothing is auto-rejected.
 */

export type PaymentVerificationResult = {
  checked: number;
  confirmed: number;
  pendingOnChain: number;
  failed: number;
  notFound: number;
  unavailable: number;
  results: Array<{ id: string; status: string; note: string }>;
};

const DEFAULT_LIMIT = 20;

export function resolveBillingCycle(value: string | null | undefined): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

export function decimalToNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    try {
      const n = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** True for the one-off purchases that promote a job instead of a plan. */
export function isFeaturedPurchase(planId: string): boolean {
  return planId === "featured_weekly" || planId === "featured_monthly";
}

export function featuredDaysFor(planId: string, duration: string | null): number {
  return duration === "weekly" || planId === "featured_weekly" ? 7 : 30;
}

/**
 * Verifies up to `limit` pending transactions.
 *
 * Throws only if the initial query fails (database down); per-transaction
 * failures are collected in `results` so one bad row cannot stop the sweep.
 */
export async function verifyPendingPayments(options?: {
  limit?: number;
}): Promise<PaymentVerificationResult> {
  const limit = options?.limit ?? DEFAULT_LIMIT;

  const pending = await db.transaction.findMany({
    where: { status: "pending", type: "crypto" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const result: PaymentVerificationResult = {
    checked: pending.length,
    confirmed: 0,
    pendingOnChain: 0,
    failed: 0,
    notFound: 0,
    unavailable: 0,
    results: [],
  };

  for (const tx of pending) {
    try {
      if (!tx.txHash || !tx.cryptoType) {
        result.results.push({
          id: tx.id,
          status: "skipped",
          note: "Missing txHash or cryptoType",
        });
        continue;
      }

      const expectedRecipient = tx.recipientAddress as string | undefined;
      const expectedCryptoAmount = decimalToNumber(tx.expectedCryptoAmount);
      if (
        !expectedRecipient ||
        expectedCryptoAmount === undefined ||
        !(expectedCryptoAmount > 0)
      ) {
        result.results.push({
          id: tx.id,
          status: "skipped",
          note: "Missing recipient or expected amount — cannot verify, needs manual fix",
        });
        continue;
      }

      const verification = await verifyTxOnChain({
        asset: tx.cryptoType,
        txHash: tx.txHash,
        expectedRecipient,
        expectedCryptoAmount,
      });

      if (verification.status === "confirmed") {
        const isFeatured = isFeaturedPurchase(tx.planId);
        const billing = resolveBillingCycle(tx.billingCycle);

        await db.$transaction(async (prisma: Prisma.TransactionClient) => {
          const claimed = await prisma.transaction.updateMany({
            where: { id: tx.id, status: "pending" },
            data: { status: "confirmed" },
          });
          if (claimed.count !== 1) throw new Error("ALREADY_PROCESSED");

          if (isFeatured) {
            const jobId = tx.jobId as string | null;
            const duration = tx.featuredDuration as string | null;
            if (jobId) {
              const days = featuredDaysFor(tx.planId, duration);
              const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
              await prisma.job.update({
                where: { id: jobId },
                data: { featured: true, featuredUntil: until, featuredTxId: tx.id },
              });
              await prisma.notification.create({
                data: {
                  userId: tx.userId,
                  type: "alert",
                  title: "Job featured! 🚀",
                  message: `Your job is now featured for ${days} days. It appears on homepage and top of search.`,
                  actionUrl: `/jobs/${jobId}`,
                },
              });
            }
          } else {
            await activatePlanForUser(
              { userId: tx.userId, planId: tx.planId, billingCycle: billing },
              prisma,
            );
            await prisma.notification.create({
              data: {
                userId: tx.userId,
                type: "alert",
                title: "Payment confirmed ✅",
                message: `Your ${tx.planId} plan (${billing}) is now active. Auto-verified on-chain.`,
                actionUrl: "/pricing",
              },
            });
          }
        });

        securityLog("admin.payment_confirm", {
          actorId: "cron:verify-payments",
          targetId: tx.userId,
          meta: {
            transactionId: tx.id,
            planId: tx.planId,
            cryptoType: tx.cryptoType,
            chainNote: verification.note,
          },
        });

        result.confirmed++;
        result.results.push({
          id: tx.id,
          status: "confirmed",
          note: verification.note,
        });
      } else if (verification.status === "pending") {
        result.pendingOnChain++;
        result.results.push({
          id: tx.id,
          status: "pending_on_chain",
          note: verification.note,
        });
      } else if (verification.status === "failed") {
        // Don't auto-reject — let admin decide (could be wrong amount/network).
        result.failed++;
        result.results.push({
          id: tx.id,
          status: "failed_on_chain",
          note: verification.note,
        });
      } else if (verification.status === "not_found") {
        result.notFound++;
        result.results.push({
          id: tx.id,
          status: "not_found",
          note: verification.note,
        });
      } else if (verification.status === "verification_unavailable") {
        result.unavailable++;
        result.results.push({
          id: tx.id,
          status: "verification_unavailable",
          note: verification.note,
        });
      }
    } catch (e) {
      console.error(`Verify error for tx ${tx.id}:`, e);
      result.results.push({
        id: tx.id,
        status: "error",
        note: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return result;
}
