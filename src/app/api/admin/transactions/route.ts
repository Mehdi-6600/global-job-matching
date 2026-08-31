import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { z } from "zod";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["confirmed", "rejected"]),
});

/** List pending/recent crypto payments — Admin only */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const transactions = await db.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, email: true, name: true, plan: true },
        },
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Admin transactions list error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * Confirm or reject a crypto payment.
 * Only confirmed upgrades User.plan.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
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

    if (status === "confirmed") {
      await db.$transaction([
        db.transaction.update({
          where: { id },
          data: { status: "confirmed" },
        }),
        db.user.update({
          where: { id: tx.userId },
          data: { plan: tx.planId },
        }),
        db.notification.create({
          data: {
            userId: tx.userId,
            type: "alert",
            title: "Payment confirmed",
            message: `Your ${tx.planId} plan is now active.`,
            actionUrl: "/pricing",
          },
        }),
      ]);
    } else {
      await db.transaction.update({
        where: { id },
        data: { status: "rejected" },
      });
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
    }

    const updated = await db.transaction.findUnique({ where: { id } });
    return NextResponse.json({ success: true, transaction: updated });
  } catch (error) {
    console.error("Admin transactions patch error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
