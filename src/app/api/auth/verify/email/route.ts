import { NextRequest, NextResponse } from "next/server";
import { authRatelimit } from "@/lib/ratelimit";
import { consumeEmailVerificationToken } from "@/lib/auth/tokens";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { emailRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** GET ?token=&email=  or POST { token, email } */
export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const { success } = await authRatelimit.limit(`verify_email_${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("token") || "";
  const email = req.nextUrl.searchParams.get("email") || "";

  if (!token || !email) {
    return NextResponse.json(
      { error: "token and email are required" },
      { status: 400 }
    );
  }

  const result = await consumeEmailVerificationToken(email, token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === "resend") {
      const session = await auth();
      if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const email = session.user.email.toLowerCase();
      const { success } = await emailRatelimit.limit(`verify_resend_${email}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
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
      if (resend && process.env.RESEND_FROM_EMAIL) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: user.email,
          subject: "Verify your email — Global Job Matching",
          html: `<p><a href="${verifyUrl}">Verify email</a></p>`,
        });
      } else if (process.env.NODE_ENV !== "production") {
        console.log("[dev] verify URL:", verifyUrl);
      }

      return NextResponse.json({
        success: true,
        message: "Verification email sent",
      });
    }

    const token = typeof body.token === "string" ? body.token : "";
    const email = typeof body.email === "string" ? body.email : "";
    if (!token || !email) {
      return NextResponse.json(
        { error: "token and email are required" },
        { status: 400 }
      );
    }

    const result = await consumeEmailVerificationToken(email, token);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
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
      { status: 500 }
    );
  }
}
