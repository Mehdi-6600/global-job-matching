import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailRatelimit } from "@/lib/ratelimit";
import { issuePasswordResetToken } from "@/lib/auth/tokens";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
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

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await emailRatelimit.limit(`forgot_${email}_${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    // Always same response (no email enumeration)
    const generic = {
      message: "If this email exists, a reset link has been sent.",
    };

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(generic, { status: 200 });
    }

    const { resetUrl } = await issuePasswordResetToken(user.email);

    if (resend && process.env.RESEND_FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: user.email,
          subject: "Reset your password — Global Job Matching",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color:#4f46e5;">Password reset</h2>
              <p>Hello ${user.name || "there"},</p>
              <p>Click the button below to set a new password. This link expires in 1 hour.</p>
              <p><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset password</a></p>
              <p style="color:#666;font-size:13px;">If you did not request this, ignore this email.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Forgot password email failed:", err);
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.log("[dev] password reset URL:", resetUrl);
    }

    return NextResponse.json(generic, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
