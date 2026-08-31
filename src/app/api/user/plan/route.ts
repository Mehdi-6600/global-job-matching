import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Source of truth for plan is User.plan.
 * Confirmed transactions may upgrade plan (admin/manual), but we do not
 * treat pending crypto as paid.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    const plan = (user?.plan || "free").toLowerCase();

    return NextResponse.json({
      plan: plan || "free",
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
