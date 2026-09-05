import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authRatelimit } from "@/lib/ratelimit";
import { validatePassword, hashPassword } from "@/lib/password";
import { consumePasswordResetToken } from "@/lib/auth/tokens";
import { getRequestIp } from "@/lib/client-ip";
import { bumpSessionVersionByEmail } from "@/lib/session-version";

/**
 * Confirm password reset with token + new password.
 * Token is consumed atomically; sessionVersion is bumped so old JWTs die.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
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
        data: {
          password: hashed,
        },
      });

      await bumpSessionVersionByEmail(consumed.email, tx);

      await tx.passwordResetToken.updateMany({
        where: {
          email: consumed.email,
          usedAt: null,
          NOT: { tokenHash: consumed.tokenHash },
        },
        data: { usedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
