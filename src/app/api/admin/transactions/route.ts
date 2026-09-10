import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import {
  activatePlanForUser,
  type BillingCycle,
} from "@/lib/subscription";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { securityLog } from "@/lib/security-log";

const patchSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["confirmed", "rejected"]),
  })
  .strict();

function resolveBillingCycle(
  value: string | null | undefined
): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function GET(req: NextRequest) {
  const authz = await requireAdmin();
  if (!authz.ok) return authz.response;

  try {
    const ip = getRequestIp(req);
    const limit = await adminRatelimit.limit(
      `admin_tx_get_${authz.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const status = new URL(req.url).searchParams.get("status");

    const transactions = await db.transaction.findMany({
      where:
        status === "pending" ||
        status === "confirmed" ||
        status === "rejected"
          ? { status }
          : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            planExpiresAt: true,
            billingCycle: true,
          },
        },
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Admin transactions list error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authz = await requireAdmin();
  if (!authz.ok) return authz.response;

  try {
    const ip = getRequestIp(req);
    const limit = await adminRatelimit.limit(
      `admin_tx_patch_${authz.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { id, status } = parsed.data;

    const tx = await db.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (tx.status === "confirmed") {
      return NextResponse.json(
        { error: "Already confirmed" },
        { status: 409 }
      );
    }

    if (tx.status === "rejected") {
      return NextResponse.json(
        { error: "Cannot change a rejected transaction" },
        { status: 409 }
      );
    }

    if (status === "confirmed") {
      const billing = resolveBillingCycle(tx.billingCycle);

      try {
        await db.$transaction(async (prisma) => {
          const claimed = await prisma.transaction.updateMany({
            where: { id, status: "pending" },
            data: { status: "confirmed" },
          });

          if (claimed.count !== 1) {
            throw Object.assign(new Error("ALREADY_PROCESSED"), {
              code: "ALREADY_PROCESSED",
            });
          }

          await activatePlanForUser(
            {
              userId: tx.userId,
              planId: tx.planId,
              billingCycle: billing,
            },
            prisma
          );

          await prisma.notification.create({
            data: {
              userId: tx.userId,
              type: "alert",
              title: "Payment confirmed",
              message: `Your ${tx.planId} plan (${billing}) is now active.`,
              actionUrl: "/pricing",
            },
          });
        });

        securityLog("admin.payment_confirm", {
          actorId: authz.user.id,
          targetId: tx.userId,
          meta: {
            transactionId: id,
            planId: tx.planId,
            billing,
          },
        });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "ALREADY_PROCESSED") {
          return NextResponse.json(
            { error: "Already confirmed" },
            { status: 409 }
          );
        }
        throw e;
      }
    } else {
      const rejected = await db.transaction.updateMany({
        where: { id, status: "pending" },
        data: { status: "rejected" },
      });
      if (rejected.count !== 1) {
        return NextResponse.json(
          { error: "Already processed" },
          { status: 409 }
        );
      }
      await db.notification.create({
        data: {
          userId: tx.userId,
          type: "alert",
          title: "Payment not verified",
          message:
            "We could not verify your crypto payment. Contact support if you need help.",
          actionUrl: "/contact",
        },
      });

      securityLog("admin.payment_reject", {
        actorId: authz.user.id,
        targetId: tx.userId,
        meta: { transactionId: id, planId: tx.planId },
      });
    }

    const updated = await db.transaction.findUnique({ where: { id } });
    return NextResponse.json({ success: true, transaction: updated });
  } catch (error) {
    console.error("Admin transactions patch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
