import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { authRatelimit } from "@/lib/ratelimit";
import { registerSchema } from "@/lib/validation/register";
import { hashPassword, validatePassword } from "@/lib/password";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";
import { getRequestIp } from "@/lib/client-ip";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
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
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(parsed.data.password);

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashed,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    try {
      const { rawToken, verifyUrl } = await issueEmailVerificationToken(email);
      if (resend) {
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM ||
            "Global Job Matching <onboarding@resend.dev>",
          to: email,
          subject: "Verify your email",
          html: `<p>Hi ${name || "there"},</p><p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        });
      }
      void rawToken;
    } catch (e) {
      console.error("Verification email failed (non-blocking):", e);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
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
