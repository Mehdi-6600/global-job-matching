import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailRatelimit } from "@/lib/ratelimit";
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
    const limit = await emailRatelimit.limit(`forgot_${email}_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(
        limit,
        "Too many requests. Try again later."
      );
    }

    // Always return the same success message (no email enumeration)
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
    });

    if (user?.password) {
      try {
        const { resetUrl } = await issuePasswordResetToken(email);
        if (resend) {
          await resend.emails.send({
            from:
              process.env.RESEND_FROM_EMAIL ||
              process.env.EMAIL_FROM ||
              "Global Job Matching <onboarding@resend.dev>",
            to: email,
            subject: "Reset your password",
            html: `<p>Hi ${user.name || "there"},</p>
<p>Reset your password using this link (valid for a limited time):</p>
<p><a href="${resetUrl}">Reset password</a></p>
<p>If you did not request this, ignore this email.</p>`,
          });
        } else if (process.env.NODE_ENV !== "production") {
          console.info("[forgot-password] Resend not configured (dev only)");
        }
      } catch (err) {
        console.error("Forgot password email error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
