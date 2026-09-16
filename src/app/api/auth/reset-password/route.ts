import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { validatePassword, hashPassword } from "@/lib/password";
import { peekPasswordResetToken, hashToken } from "@/lib/auth/tokens";
import { getRequestIp } from "@/lib/client-ip";
import { bumpSessionVersionByEmail } from "@/lib/session-version";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

/**
 * Confirm password reset with token + new password.
 * Token is only consumed inside the same transaction as the password update
 * so a failed update does not burn the token.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limit = await safeLimit(authRatelimit, `reset_pw_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const token =
      typeof body === "object" &&
      body !== null &&
      "token" in body &&
      typeof (body as { token: unknown }).token === "string"
        ? (body as { token: string }).token.trim()
        : "";

    const password =
      typeof body === "object" && body !== null && "password" in body
        ? (body as { password: unknown }).password
        : undefined;

    const passwordCheck = validatePassword(password);
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const peeked = await peekPasswordResetToken(token);
    if (!peeked.ok) {
      return NextResponse.json(
        { error: peeked.error },
        { status: peeked.status }
      );
    }

    const hashed = await hashPassword(passwordCheck.password);
    const tokenHash = peeked.tokenHash;

    try {
      await db.$transaction(async (tx) => {
        // Re-check token still exists (single-use / race protection)
        const stillThere = await tx.verificationToken.findFirst({
          where: {
            identifier: peeked.identifier,
            token: tokenHash,
            expires: { gt: new Date() },
          },
        });
        if (!stillThere) {
          throw new Error("TOKEN_USED");
        }

        await tx.user.update({
          where: { email: peeked.email },
          data: { password: hashed },
        });

        await bumpSessionVersionByEmail(peeked.email, tx);

        const deleted = await tx.verificationToken.deleteMany({
          where: {
            identifier: peeked.identifier,
            token: tokenHash,
          },
        });
        if (deleted.count !== 1) {
          throw new Error("TOKEN_USED");
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message === "TOKEN_USED") {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 400 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
