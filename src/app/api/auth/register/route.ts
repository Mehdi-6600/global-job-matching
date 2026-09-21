import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { authRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { registerSchema } from "@/lib/validation/register";
import { hashPassword, validatePassword } from "@/lib/password";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    /* -------- Rate limit: IP -------- */
    const ip = getRequestIp(req);
    const ipLimit = await safeLimit(authRatelimit, `register_ip_${ip}`);
    if (!ipLimit.success) {
      return rateLimitedResponse(
        ipLimit,
        "Too many requests. Try again in a minute.",
      );
    }

    /* -------- Parse body -------- */
    const body = await readJsonBody(req);
    if (body === null) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const passwordCheck = validatePassword(parsed.data.password);
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const name = parsed.data.name.trim();
    const role =
      parsed.data.role === "EMPLOYER" ? ROLES.EMPLOYER : ROLES.JOB_SEEKER;

    /* -------- Rate limit: email (per-address abuse) -------- */
    const emailLimit = await safeLimit(
      authRatelimit,
      `register_email_${email}`,
    );
    if (!emailLimit.success) {
      return rateLimitedResponse(
        emailLimit,
        "Too many requests for this email. Try again later.",
      );
    }

    /* -------- Email uniqueness -------- */
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Email already registered. Please sign in or reset your password.",
          code: "EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    /* -------- Hash + create -------- */
    const hashed = await hashPassword(passwordCheck.password);

    let user: { id: string; email: string; name: string | null; role: string };
    try {
      user = await db.user.create({
        data: {
          email,
          name,
          password: hashed,
          role,
        },
        select: { id: true, email: true, name: true, role: true },
      });
    } catch (createErr) {
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        return NextResponse.json(
          {
            error:
              "Email already registered. Please sign in or reset your password.",
            code: "EMAIL_EXISTS",
          },
          { status: 409 },
        );
      }
      throw createErr;
    }

    /* -------- Email verification (best-effort) -------- */
    let verificationEmailSent = false;
    try {
      const { verifyUrl } = await issueEmailVerificationToken(email);
      if (resend) {
        const from =
          process.env.RESEND_FROM_EMAIL ||
          process.env.EMAIL_FROM ||
          "Global Job Matching <onboarding@resend.dev>";
        const sendResult = await resend.emails.send({
          from,
          to: email,
          subject: "Verify your email",
          html: `<p>Hi ${name || "there"},</p>
<p>Verify your email to unlock the full platform:</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        });
        // resend SDK returns { data, error } — treat either absence as failure
        verificationEmailSent = !("error" in sendResult) || !sendResult.error;
      }
    } catch (e) {
      console.error("Verification email failed (non-blocking):", e);
    }

    /* -------- Response -------- */
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        verificationEmailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "REGISTER_FAILED" },
      { status: 500 },
    );
  }
}
