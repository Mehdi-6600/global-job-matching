import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { userUpdateSchema } from "@/lib/validation/user";

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

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
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `user_update_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, image, avatar, phone, location, bio } = parsed.data;

    const userData: {
      name?: string;
      email?: string;
      image?: string | null;
    } = {};

    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email.toLowerCase();
    if (image !== undefined) userData.image = image;
    else if (avatar !== undefined) userData.image = avatar;

    if (Object.keys(userData).length > 0) {
      if (userData.email) {
        const taken = await db.user.findFirst({
          where: {
            email: userData.email,
            NOT: { id: session.user.id },
          },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
      }

      await db.user.update({
        where: { id: session.user.id },
        data: userData,
      });
    }

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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
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

    return NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        title: user!.profile?.skills ?? null,
        phone: user!.profile?.phone ?? null,
        location: user!.profile?.location ?? null,
        bio: user!.profile?.bio ?? null,
        image: user!.image,
        avatar: user!.image,
        role: user!.role,
        createdAt: user!.createdAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
