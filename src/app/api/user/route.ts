import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { userUpdateSchema } from "@/lib/validation/user";
import { getRequestIp } from "@/lib/client-ip";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";
import { securityLog } from "@/lib/security-log";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const first = local[0] ?? "*";
  return `${first}***@${domain}`;
}

/* ------------------------------------------------------------------ */
/* GET — current user                                                  */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            location: true,
            phone: true,
            skills: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        title: user.profile?.skills ?? null,
        phone: user.profile?.phone ?? null,
        location: user.profile?.location ?? null,
        bio: user.profile?.bio ?? null,
        image: user.image,
        avatar: user.image,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* PUT — update user + profile                                         */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = await safeLimit(
      ratelimit,
      `user_update_${session.user.id}_${ip}`,
    );
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, email, image, avatar, phone, location, bio } = parsed.data;

    /* -------- Current user (need email for comparison) -------- */
    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* -------- Build user update -------- */
    const userData: {
      name?: string;
      email?: string;
      image?: string | null;
      emailVerified?: Date | null;
    } = {};

    if (name !== undefined) userData.name = name;
    if (image !== undefined) userData.image = image;
    else if (avatar !== undefined) userData.image = avatar;

    let emailChanged = false;
    let emailVerificationResent = false;

    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();

      if (normalized !== current.email) {
        // Uniqueness check
        const taken = await db.user.findFirst({
          where: {
            email: normalized,
            NOT: { id: session.user.id },
          },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json(
            { error: "Email already in use", code: "EMAIL_TAKEN" },
            { status: 409 },
          );
        }

        // RC15: a new email MUST be re-verified.
        // Any previous verification is invalidated.
        userData.email = normalized;
        userData.emailVerified = null;
        emailChanged = true;
      }
    }

    /* -------- Persist user fields -------- */
    if (Object.keys(userData).length > 0) {
      await db.user.update({
        where: { id: session.user.id },
        data: userData,
      });
    }

    /* -------- Profile upsert -------- */
    const profileData: {
      phone?: string | null;
      location?: string | null;
      bio?: string | null;
    } = {};

    if (phone !== undefined) profileData.phone = phone || null;
    if (location !== undefined) profileData.location = location || null;
    if (bio !== undefined) profileData.bio = bio || null;

    if (Object.keys(profileData).length > 0) {
      await db.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...profileData,
        },
        update: profileData,
      });
    }

    /* -------- Send verification email for new address -------- */
    if (emailChanged && userData.email) {
      try {
        await issueEmailVerificationToken(userData.email);
        // Note: we only issue the token here. The user trigger the
        // actual email send via POST /api/auth/verify/email { action: "resend" }
        // or we could send it inline (see below).
        emailVerificationResent = true;

        securityLog("auth.password_reset", {
          // No dedicated "email_change" event; using closest type.
          // If you add `account.email_change` to SecurityEventType, switch here.
          actorId: session.user.id,
          targetId: session.user.id,
          meta: {
            to: maskEmail(userData.email),
          },
        });
      } catch (e) {
        console.error(
          "[user] failed to issue verification token for new email:",
          e,
        );
      }
    }

    /* -------- Return refreshed user -------- */
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            location: true,
            phone: true,
            skills: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      emailChanged,
      emailVerificationResent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        title: user.profile?.skills ?? null,
        phone: user.profile?.phone ?? null,
        location: user.profile?.location ?? null,
        bio: user.profile?.bio ?? null,
        image: user.image,
        avatar: user.image,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
