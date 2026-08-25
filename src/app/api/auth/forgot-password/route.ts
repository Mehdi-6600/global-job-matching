import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { Resend } from "resend";
import { emailRatelimit } from "@/lib/ratelimit";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateResetToken(userId: string) {
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  const hmac = createHmac("sha256", process.env.AUTH_SECRET!).update(data).digest("hex");
  return Buffer.from(`${userId}:${timestamp}:${hmac}`).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { success } = await emailRatelimit.limit(email.toLowerCase().trim());
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Try again in an hour." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "If this email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    const token = generateResetToken(user.id);
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: user.email,
      subject: "Reset your password - Global Job Matching",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #999;">Global Job Matching Team</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "If this email exists, a reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
