import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { z } from "zod";

const deleteSchema = z
  .object({
    confirm: z.literal("DELETE"),
  })
  .strict();

/**
 * Permanently deletes the authenticated user's account and related data
 * (cascade where schema supports it).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Send { "confirm": "DELETE" } to proceed' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Best-effort cleanup for relations without cascade
    await db.$transaction([
      db.notification.deleteMany({ where: { userId } }),
      db.savedJob.deleteMany({ where: { userId } }),
      db.jobAlert.deleteMany({ where: { userId } }),
      db.application.deleteMany({ where: { userId } }),
      db.profile.deleteMany({ where: { userId } }),
      db.user.delete({ where: { id: userId } }),
    ]);

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
