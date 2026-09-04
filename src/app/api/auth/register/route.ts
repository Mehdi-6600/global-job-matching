import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { authRatelimit } from "@/lib/ratelimit";
import { registerSchema } from "@/lib/validation/register";
import { hashPassword, validatePassword } from "@/lib/password";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await authRatelimit.limit(`register_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(parsed.data.password);
    if (!passwordCheck.ok) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const name = parsed.data.name.trim();
    const role =
      parsed.data.role === "EMPLOYER" ? ROLES.EMPLOYER : ROLES.JOB_SEEKER;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(passwordCheck.password);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    // Send verification email (non-blocking for UX; log failures)
    try {
      const { verifyUrl } = await issueEmailVerificationToken(user.email);
      if (resend && process.env.RESEND_FROM_EMAIL) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: user.email,
          subject: "Verify your email — Global Job Matching",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#4f46e5;">Verify your email</h2>
              <p>Welcome${user.name ? `, ${user.name}` : ""}!</p>
              <p><a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify email</a></p>
              <p style="color:#666;font-size:13px;">Link expires in 24 hours.</p>
            </div>
          `,
        });
      } else if (process.env.NODE_ENV !== "production") {
        console.log("[dev] verify URL:", verifyUrl);
      }
    } catch (err) {
      console.error("Verification email failed:", err);
    }

    return NextResponse.json(
      {
        success: true,
        user,
        message: "Account created. Please verify your email.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
