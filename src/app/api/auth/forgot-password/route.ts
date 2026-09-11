import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { issuePasswordResetToken } from "@/lib/auth/tokens";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const email =
      typeof body === "object" &&
      body !== null &&
      "email" in body &&
      typeof (body as { email: unknown }).email === "string"
        ? (body as { email: string }).email.toLowerCase().trim()
        : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req);
    const limit = await safeLimit(emailRatelimit, `forgot_${email}_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(
        limit,
        "Too many requests. Try again later."
      );
    }

    // Always same success message (no email enumeration)
    const genericOk = {
      success: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    };

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Any existing user can reset — even if password was null/corrupt
    if (user) {
      try {
        const { resetUrl } = await issuePasswordResetToken(email);

        if (!resend) {
          console.error(
            "[forgot-password] RESEND_API_KEY missing — reset token created but email not sent"
          );
        } else {
          const from =
            process.env.RESEND_FROM_EMAIL ||
            process.env.EMAIL_FROM ||
            "Global Job Matching <onboarding@resend.dev>";

          const sendResult = await resend.emails.send({
            from,
            to: email,
            subject: "Reset your password — Global Job Matching",
            html: `<p>Hi ${user.name || "there"},</p>
<p>Reset your password with this link (valid about 1 hour):</p>
<p><a href="${resetUrl}">Reset password</a></p>
<p>If you did not request this, ignore this email.</p>
<p style="color:#888;font-size:12px;">If the button does not work, copy this URL:<br/>${resetUrl}</p>`,
          });

          if (sendResult.error) {
            console.error("[forgot-password] Resend error:", sendResult.error);
          }
        }
      } catch (err) {
        console.error("Forgot password token/email error:", err);
        // Still return generic success to avoid leaking internals
      }
    }

    return NextResponse.json(genericOk);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
