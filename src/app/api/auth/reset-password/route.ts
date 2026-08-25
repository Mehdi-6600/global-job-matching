import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function sendResetEmail(email: string, resetUrl: string) {
  console.log(`[RESET EMAIL] To: ${email} | Link: ${resetUrl}`);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ success: true, message: "If email exists, reset link sent" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.passwordResetToken.create({
      data: { email: user.email, tokenHash, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://global-job-matching.vercel.app"}/reset-password?token=${token}`;
    await sendResetEmail(user.email, resetUrl);

    return NextResponse.json({ success: true, message: "If email exists, reset link sent" });
  } catch (error) {
    console.error("Reset password request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Token and password (min 8 chars) required" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }
    if (resetToken.usedAt) {
      return NextResponse.json({ error: "Token already used" }, { status: 400 });
    }
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.$transaction([
      db.user.update({ where: { email: resetToken.email }, data: { password: hashedPassword } }),
      db.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
