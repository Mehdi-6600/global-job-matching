import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
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
        title: null,
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

    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : undefined;
    const email =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const image =
      typeof body.avatar === "string"
        ? body.avatar.trim()
        : typeof body.image === "string"
          ? body.image.trim()
          : undefined;

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;
    const location =
      typeof body.location === "string" ? body.location.trim() : undefined;
    const bio =
      typeof body.bio === "string" ? body.bio.trim() : undefined;

    // به‌روزرسانی فیلدهای User
    const userData: {
      name?: string;
      email?: string;
      image?: string | null;
    } = {};

    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email;
    if (image !== undefined) userData.image = image || null;

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userData,
      });
    }

    // به‌روزرسانی فیلدهای Profile
    const profileData: {
      phone?: string | null;
      location?: string | null;
      bio?: string | null;
    } = {};

    if (phone !== undefined) profileData.phone = phone || null;
    if (location !== undefined) profileData.location = location || null;
    if (bio !== undefined) profileData.bio = bio || null;

    if (Object.keys(profileData).length > 0) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...profileData,
        },
        update: profileData,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        profile: {
          select: {
            phone: true,
            location: true,
            bio: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: null,
        phone: user.profile?.phone ?? null,
        location: user.profile?.location ?? null,
        bio: user.profile?.bio ?? null,
        image: user.image,
        avatar: user.image,
        role: user.role,
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
