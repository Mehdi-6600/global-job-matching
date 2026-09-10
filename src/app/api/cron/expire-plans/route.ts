import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";
import { expireOverduePlans } from "@/lib/subscription";
import { db } from "@/lib/db";
import { securityLog } from "@/lib/security-log";

/**
 * Daily cron: downgrade users with expired paid plans to free.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.length < 16) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 }
      );
    }

    if (!isAuthorizedBearerSecret(req, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await expireOverduePlans(db, 500);

    if (result.userIds.length > 0) {
      try {
        await db.notification.createMany({
          data: result.userIds.map((userId) => ({
            userId,
            type: "alert",
            title: "Plan expired",
            message:
              "Your paid plan has expired. You are now on the Free plan. Renew anytime on Pricing.",
            actionUrl: "/pricing",
          })),
        });
      } catch (e) {
        console.error("Expire-plans notification error:", e);
      }

      securityLog("plan.expire", {
        actorId: "cron:expire-plans",
        meta: {
          expiredCount: result.expiredCount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
    });
  } catch (error) {
    console.error("Expire plans cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
