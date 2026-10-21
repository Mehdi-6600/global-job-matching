import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { verifyTxOnChain } from "@/lib/payment/verify-crypto";
import { activatePlanForUser, type BillingCycle } from "@/lib/subscription";
import { securityLog } from "@/lib/security-log";

function resolveBillingCycle(value: string | null | undefined): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

function decimalToNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    try {
      const n = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(n) ? n : undefined;
    } catch { return undefined; }
  }
  return undefined;
}

/**
 * Auto-verification cron: checks pending crypto payments on-chain
 * and auto-confirms if verification passes.
 *
 * Without RPC/TRONGRID keys, verification will be "unavailable" and
 * transactions stay pending for manual admin review — fail-closed design.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * Vercel cron: every 10 minutes
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.length < 16) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    if (!isAuthorizedBearerSecret(req, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch up to 20 oldest pending crypto transactions
    const pending = await db.transaction.findMany({
      where: { status: "pending", type: "crypto" },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (pending.length === 0) {
      return NextResponse.json({ success: true, message: "No pending transactions", checked: 0, confirmed: 0 });
    }

    let confirmed = 0;
    let failed = 0;
    let pendingOnChain = 0;
    let unavailable = 0;
    let notFound = 0;
    const results: Array<{ id: string; status: string; note: string }> = [];

    for (const tx of pending) {
      try {
        // Skip if missing critical data
        if (!tx.txHash || !tx.cryptoType) {
          results.push({ id: tx.id, status: "skipped", note: "Missing txHash or cryptoType" });
          continue;
        }

        const expectedRecipient = tx.recipientAddress as string | undefined;
        const expectedCryptoAmount = decimalToNumber(tx.expectedCryptoAmount);
        if (!expectedRecipient || expectedCryptoAmount === undefined || !(expectedCryptoAmount > 0)) {
          results.push({ id: tx.id, status: "skipped", note: "Missing recipient or expected amount — cannot verify, needs manual fix" });
          continue;
        }

        const verification = await verifyTxOnChain({
          asset: tx.cryptoType,
          txHash: tx.txHash,
          expectedRecipient,
          expectedCryptoAmount,
        });

        if (verification.status === "confirmed") {
          // Auto-confirm: same logic as admin manual confirm
          const isFeatured = tx.planId === "featured_weekly" || tx.planId === "featured_monthly";
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
                const days = duration === "weekly" || tx.planId === "featured_weekly" ? 7 : 30;
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
              await activatePlanForUser({ userId: tx.userId, planId: tx.planId, billingCycle: billing }, prisma);
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
            meta: { transactionId: tx.id, planId: tx.planId, cryptoType: tx.cryptoType, chainNote: verification.note },
          });

          confirmed++;
          results.push({ id: tx.id, status: "confirmed", note: verification.note });
        } else if (verification.status === "pending") {
          pendingOnChain++;
          results.push({ id: tx.id, status: "pending_on_chain", note: verification.note });
        } else if (verification.status === "failed") {
          // Don't auto-reject — let admin decide (could be wrong amount/network). Just log.
          failed++;
          results.push({ id: tx.id, status: "failed_on_chain", note: verification.note });
        } else if (verification.status === "not_found") {
          notFound++;
          results.push({ id: tx.id, status: "not_found", note: verification.note });
        } else if (verification.status === "verification_unavailable") {
          unavailable++;
          results.push({ id: tx.id, status: "verification_unavailable", note: verification.note });
        }
      } catch (e) {
        console.error(`Verify error for tx ${tx.id}:`, e);
        results.push({ id: tx.id, status: "error", note: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true,
      checked: pending.length,
      confirmed,
      pendingOnChain,
      failed,
      notFound,
      unavailable,
      results,
      hint: unavailable > 0 ? "Set TRONGRID_API_KEY + CRYPTO_BSC_RPC_URL in Vercel ENV for auto-verification" : undefined,
    });
  } catch (error) {
    console.error("Verify-payments cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
