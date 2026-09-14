import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse } from "@/lib/http";
import { getCryptoWallets } from "@/lib/payment/plans";
import { isRedisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/ops
 * Compact production snapshot for OWNER/ADMIN (no secrets).
 */
export async function GET(req: NextRequest) {
  const authz = await requireAdmin();
  if (!authz.ok) return authz.response;

  try {
    const ip = getRequestIp(req);
    const limit = await adminRatelimit.limit(
      `admin_ops_${authz.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const [
      users,
      activeJobs,
      pendingTx,
      confirmedTx24h,
      applications24h,
      companies,
    ] = await Promise.all([
      db.user.count(),
      db.job.count({ where: { status: "active" } }),
      db.transaction.count({ where: { status: "pending" } }),
      db.transaction.count({
        where: {
          status: "confirmed",
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      db.application.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      db.company.count(),
    ]);

    let walletCount = 0;
    try {
      walletCount = getCryptoWallets().length;
    } catch {
      walletCount = 0;
    }

    return NextResponse.json({
      ok: true,
      time: new Date().toISOString(),
      counts: {
        users,
        companies,
        activeJobs,
        pendingTransactions: pendingTx,
        confirmedTransactionsLast24h: confirmedTx24h,
        applicationsLast24h: applications24h,
      },
      infrastructure: {
        redis: isRedisConfigured(),
        cryptoWallets: walletCount,
        region: process.env.VERCEL_REGION || null,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
      },
      attention:
        pendingTx > 0
          ? `${pendingTx} payment(s) waiting for admin review`
          : null,
    });
  } catch (error) {
    console.error("Admin ops error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
