import { NextRequest, NextResponse } from "next/server";
import { authRatelimit, emailRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/* ------------------------------------------------------------------ */
/* Shared helper                                                       */
/* ------------------------------------------------------------------ */

/**
 * Mask an email for logging: a***@example.com.
 * Never log the full email in errors or console output.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const first = local[0] ?? "*";
  return `${first}***@${domain}`;
}

/* ------------------------------------------------------------------ */
/* GET — confirm verification from email link                          */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const limit = await safeLimit(authRatelimit, `verify_email_ip_${ip}`);
  if (!limit.success) {
    return rateLimitedResponse(limit, "Too many requests");
  }

  const token = req.nextUrl.searchParams.get("token") || "";
  const email = req.nextUrl.searchParams.get("email") || "";

  if (!token || !email) {
    return NextResponse.json(
      { error: "token and email are required" },
      { status: 400 },
    );
  }

  // `consumeEmailVerificationToken(rawToken, email)` — order matters.
  const result = await consumeEmailVerificationToken(token, email);
  if (!result.ok) {
    // Do not echo email in the error response.
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully",
  });
}

/* ------------------------------------------------------------------ */
/* POST — confirm or resend                                            */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const action =
      typeof (body as { action?: unknown }).action === "string"
        ? (body as { action: string }).action
        : undefined;

    /* -------- action: resend -------- */
    if (action === "resend") {
      const session = await auth();
      if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const email = session.user.email.toLowerCase();
      const limit = await safeLimit(
        emailRatelimit,
        `verify_resend_${email}`,
      );
      if (!limit.success) {
        return rateLimitedResponse(limit, "Too many requests");
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, emailVerified: true, name: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (user.emailVerified) {
        return NextResponse.json({
          success: true,
          message: "Email already verified",
        });
      }

      const { verifyUrl } = await issueEmailVerificationToken(user.email);

      let emailSent = false;
      if (resend && process.env.RESEND_FROM_EMAIL) {
        try {
          const sendResult = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: user.email,
            subject: "Verify your email — Global Job Matching",
            html: `<p><a href="${verifyUrl}">Verify email</a></p>`,
          });
          emailSent = !("error" in sendResult) || !sendResult.error;
        } catch (e) {
          console.error(
            "[verify-email] resend failed for",
            maskEmail(user.email),
            e,
          );
        }
      } else if (process.env.NODE_ENV !== "production") {
        console.log("[dev] verify URL:", verifyUrl);
      }

      return NextResponse.json({
        success: true,
        message: emailSent
          ? "Verification email sent"
          : "Verification email queued",
        emailSent,
      });
    }

    /* -------- default action: confirm token -------- */
    const ip = getRequestIp(req);
    const limit = await safeLimit(authRatelimit, `verify_email_ip_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(limit, "Too many requests");
    }

    const token =
      typeof (body as { token?: unknown }).token === "string"
        ? (body as { token: string }).token
        : "";
    const email =
      typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : "";

    if (!token || !email) {
      return NextResponse.json(
        { error: "token and email are required" },
        { status: 400 },
      );
    }

    const result = await consumeEmailVerificationToken(token, email);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
