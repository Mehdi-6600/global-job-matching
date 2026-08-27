import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ratelimit } from "@/lib/ratelimit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().max(100).optional(), // stored in Profile.skills as job title
  bio: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            skills: true,
            phone: true,
            location: true,
            resumeUrl: true,
            linkedin: true,
            github: true,
            portfolio: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        title: user.profile?.skills || null,
        bio: user.profile?.bio || null,
        location: user.profile?.location || null,
        phone: user.profile?.phone || null,
        avatar: user.image,
        role: user.role,
        resumeUrl: user.profile?.resumeUrl || null,
        linkedin: user.profile?.linkedin || null,
        github: user.profile?.github || null,
        portfolio: user.profile?.portfolio || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
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

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const { success } = await ratelimit.limit(
      `profile_update_${session.user.id}_${ip}`
    );

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, title, bio, location, phone } = result.data;

    if (name !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    const profileData: {
      bio?: string | null;
      skills?: string | null;
      location?: string | null;
      phone?: string | null;
    } = {};

    if (bio !== undefined) profileData.bio = bio || null;
    if (title !== undefined) profileData.skills = title || null;
    if (location !== undefined) profileData.location = location || null;
    if (phone !== undefined) profileData.phone = phone || null;

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
        email: true,
        name: true,
        image: true,
        role: true,
        profile: {
          select: {
            bio: true,
            skills: true,
            phone: true,
            location: true,
            resumeUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        title: user!.profile?.skills || null,
        bio: user!.profile?.bio || null,
        location: user!.profile?.location || null,
        phone: user!.profile?.phone || null,
        avatar: user!.image,
        role: user!.role,
        resumeUrl: user!.profile?.resumeUrl || null,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
