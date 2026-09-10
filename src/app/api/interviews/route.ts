import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { parseListLimit, LIST_LIMITS } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `interviews_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const take = parseListLimit(
      searchParams.get("limit"),
      LIST_LIMITS.userList
    );

    const interviews = await db.interview.findMany({
      where: { userId: session.user.id },
      orderBy: { scheduledAt: "asc" },
      take,
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

    return NextResponse.json({ interviews, limit: take });
  } catch (error) {
    console.error("Get user interviews error:", error);
    return NextResponse.json(
      { error: "Failed to load interviews" },
      { status: 500 }
    );
  }
}
