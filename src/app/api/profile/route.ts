import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/profile - fetch current user's profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

// PUT /api/profile - create or update profile
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const data = {
      headline: body.headline || null,
      skills: body.skills || [],
      country: body.country || null,
      city: body.city || null,
      desiredSalary: body.desiredSalary ?? null,
      searchRadiusKm: body.searchRadiusKm ?? 50,
    };

    const profile = await db.profile.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Profile save error:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
