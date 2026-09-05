import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authRatelimit } from "@/lib/ratelimit";
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import { getRequestIp } from "@/lib/client-ip";
import { bumpSessionVersion } from "@/lib/session-version";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ip = getRequestIp(req);
    const { success } = await authRatelimit.limit(
      `change_pw_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const passwordCheck = validatePassword(body.newPassword);

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Cannot change password for this account" },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(passwordCheck.password);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { password: hashed },
      });
      await bumpSessionVersion(session.user.id, tx);
    });

    return NextResponse.json({
      success: true,
      message:
        "Password updated. Please sign in again — other sessions are now invalid.",
      requireReauth: true,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
