import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { env } from "@/lib/env";

/**
 * One-time bootstrap: if no ADMIN/OWNER exists yet, the logged-in user
 * whose email matches OWNER_EMAIL becomes OWNER.
 * After the first owner exists, this endpoint always returns 403.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();
    const ownerEmail = env.OWNER_EMAIL.toLowerCase().trim();

    if (email !== ownerEmail) {
      return NextResponse.json(
        { error: "Only OWNER_EMAIL can bootstrap" },
        { status: 403 }
      );
    }

    const existingAdmins = await db.user.count({
      where: {
        role: { in: [ROLES.ADMIN, ROLES.OWNER] },
      },
    });

    if (existingAdmins > 0) {
      return NextResponse.json(
        { error: "Bootstrap already completed" },
        { status: 403 }
      );
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: { role: ROLES.OWNER },
      select: { id: true, email: true, role: true, name: true },
    });

    return NextResponse.json({
      success: true,
      message:
        "You are now OWNER. Sign out and sign in again so the session picks up the new role.",
      user,
    });
  } catch (error) {
    console.error("Admin bootstrap error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
