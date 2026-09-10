import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { isOwnerRole } from "@/lib/roles";
import { z } from "zod";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";
import { securityLog } from "@/lib/security-log";
import { deleteResumeIfBlob } from "@/lib/storage/resume";

const deleteSchema = z
  .object({
    confirm: z.literal("DELETE"),
  })
  .strict();

/**
 * Permanently delete the current user account.
 * Body: { "confirm": "DELETE" }
 *
 * Last remaining OWNER cannot be deleted (race-safe inside transaction).
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await ratelimit.limit(
      `account_delete_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const body = await readJsonBody(req);
    if (body === null) {
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
    let resumeUrl: string | null = null;

    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      }

      if (isOwnerRole(user.role)) {
        await tx.$executeRaw`SELECT id FROM "User" WHERE role = 'OWNER' FOR UPDATE`;
        const ownerCount = await tx.user.count({
          where: { role: "OWNER" },
        });
        if (ownerCount <= 1) {
          throw Object.assign(new Error("LAST_OWNER"), {
            code: "LAST_OWNER",
          });
        }
      }

      const profile = await tx.profile.findUnique({
        where: { userId },
        select: { resumeUrl: true },
      });
      resumeUrl = profile?.resumeUrl ?? null;

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

    await deleteResumeIfBlob(resumeUrl);

    securityLog("account.delete", {
      actorId: userId,
      targetId: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted",
    });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (err.code === "LAST_OWNER") {
      return NextResponse.json(
        {
          error:
            "Cannot delete the last OWNER account. Promote another owner first.",
          code: "LAST_OWNER",
        },
        { status: 403 }
      );
    }
    console.error("Account delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
