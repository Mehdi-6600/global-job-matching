import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authRatelimit } from "@/lib/ratelimit";
import { validatePassword, hashPassword } from "@/lib/password";
import {
  consumePasswordResetToken,
  markPasswordResetUsed,
} from "@/lib/auth/tokens";

/**
 * Confirm password reset with token + new password.
 * (Requesting a link is POST /api/auth/forgot-password only.)
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await authRatelimit.limit(`reset_pw_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: { token?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const passwordCheck = validatePassword(body.password);
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const consumed = await consumePasswordResetToken(token);
    if (!consumed.ok) {
      return NextResponse.json(
        { error: consumed.error },
        { status: consumed.status }
      );
    }

    const hashed = await hashPassword(passwordCheck.password);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: consumed.email },
        data: { password: hashed },
      });
      await tx.passwordResetToken.update({
        where: { tokenHash: consumed.tokenHash },
        data: { usedAt: new Date() },
      });
      // Invalidate any other unused tokens for this email
      await tx.passwordResetToken.updateMany({
        where: {
          email: consumed.email,
          usedAt: null,
          NOT: { tokenHash: consumed.tokenHash },
        },
        data: { usedAt: new Date() },
      });
    });

    await markPasswordResetUsed(consumed.tokenHash).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
