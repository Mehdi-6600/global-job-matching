import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const interviews = await db.interview.findMany({
      where: { userId: session.user.id },
      orderBy: { scheduledAt: "asc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: {
              select: { name: true },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("Get user interviews error:", error);
    return NextResponse.json(
      { error: "Failed to load interviews" },
      { status: 500 }
    );
  }
}
