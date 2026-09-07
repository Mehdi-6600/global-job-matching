import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { z } from "zod";

const deleteSchema = z
  .object({
    confirm: z.literal("DELETE"),
  })
  .strict();

/**
 * Permanently delete the current user account.
 * Requires JSON body: { "confirm": "DELETE" }
 * Owner account (OWNER_EMAIL) cannot be deleted.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `account_delete_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body required: { "confirm": "DELETE" }' },
        { status: 400 }
      );
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirm deletion with { "confirm": "DELETE" }' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const ownerEmail = process.env.OWNER_EMAIL?.trim();

    if (
      ownerEmail &&
      userEmail.toLowerCase() === ownerEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Owner account cannot be deleted." },
        { status: 403 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /**
     * Explicit child cleanup then user.
     * Application relation is `user` (userId), not `applicant`.
     * Most relations use onDelete: Cascade — extra deletes are safe.
     */
    await db.$transaction(async (tx) => {
      await tx.jobAlert.deleteMany({ where: { userId } });
      await tx.application.deleteMany({ where: { userId } });
      await tx.savedJob.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.interview.deleteMany({ where: { userId } });
      await tx.usageEvent.deleteMany({ where: { userId } });
      await tx.careerRiskAssessment.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted",
    });
  } catch (error) {
    console.error("Account delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
