import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user - Get current user info
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
            phone: true,
            location: true,
            skills: true,
            experience: true,
            education: true,
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

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get user" },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update user info
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Separate User and Profile fields
    const userUpdate: any = {};
    const profileUpdate: any = {};

    // User model fields
    if (body.name !== undefined) userUpdate.name = body.name || undefined;
    if (body.email !== undefined) userUpdate.email = body.email || undefined;
    if (body.image !== undefined) userUpdate.image = body.image || null;

    // Profile model fields
    if (body.bio !== undefined) profileUpdate.bio = body.bio || null;
    if (body.phone !== undefined) profileUpdate.phone = body.phone || null;
    if (body.location !== undefined) profileUpdate.location = body.location || null;
    if (body.skills !== undefined) profileUpdate.skills = body.skills || null;
    if (body.experience !== undefined) profileUpdate.experience = body.experience || null;
    if (body.education !== undefined) profileUpdate.education = body.education || null;
    if (body.resumeUrl !== undefined) profileUpdate.resumeUrl = body.resumeUrl || null;
    if (body.linkedin !== undefined) profileUpdate.linkedin = body.linkedin || null;
    if (body.github !== undefined) profileUpdate.github = body.github || null;
    if (body.portfolio !== undefined) profileUpdate.portfolio = body.portfolio || null;

    // Update User
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: userUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    // Update or create Profile if there are profile fields to update
    if (Object.keys(profileUpdate).length > 0) {
      await prisma.profile.upsert({
        where: { userId: session.user.id },
        update: profileUpdate,
        create: {
          userId: session.user.id,
          ...profileUpdate,
        },
      });
    }

    // Fetch complete updated user with profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        profile: {
          select: {
            bio: true,
            phone: true,
            location: true,
            skills: true,
            experience: true,
            education: true,
            resumeUrl: true,
            linkedin: true,
            github: true,
            portfolio: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
