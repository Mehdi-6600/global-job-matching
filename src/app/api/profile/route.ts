import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { profileUpdateSchema } from "@/lib/validation/profile";

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

function mapProfile(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  createdAt?: Date;
  profile: {
    bio: string | null;
    skills: string | null;
    phone: string | null;
    location: string | null;
    resumeUrl: string | null;
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  } | null;
}) {
  return {
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
  };
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
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

    return NextResponse.json({ profile: mapProfile(user) });
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

    const ip = getClientIp(req);
    const { success } = await ratelimit.limit(
      `profile_update_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, title, bio, location, phone, linkedin, github, portfolio } =
      parsed.data;

    if (name !== undefined) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    const profileData: Record<string, string | null> = {};
    if (bio !== undefined) profileData.bio = bio || null;
    if (title !== undefined) profileData.skills = title || null;
    if (location !== undefined) profileData.location = location || null;
    if (phone !== undefined) profileData.phone = phone || null;
    if (linkedin !== undefined) profileData.linkedin = linkedin;
    if (github !== undefined) profileData.github = github;
    if (portfolio !== undefined) profileData.portfolio = portfolio;

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
            linkedin: true,
            github: true,
            portfolio: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile: mapProfile(user!),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
