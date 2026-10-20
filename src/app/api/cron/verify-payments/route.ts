import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { verifyPendingPayments } from "@/lib/payment/verify-pending-payments";

/**
 * Crypto payment sweep — authenticated entry point.
 *
 * Runs daily from the Vercel cron (the Hobby plan's maximum) and on demand from
 * GitHub Actions (`CRON_SECRET`). The 10-minute cadence is handled in-process by
 * src/lib/payment/sweep-scheduler.ts, which needs no secret and no scheduler.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * The actual work lives in verifyPendingPayments() so both callers share it.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.length < 16) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }
    if (!isAuthorizedBearerSecret(req, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyPendingPayments();

    return NextResponse.json({
      success: true,
      ...result,
      hint:
        result.unavailable > 0
          ? "Set TRONGRID_API_KEY + CRYPTO_BSC_RPC_URL in Vercel ENV for auto-verification"
          : undefined,
    });
  } catch (error) {
    console.error("Verify-payments cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
