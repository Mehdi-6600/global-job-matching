import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["employer", "admin", "owner"];
  if (!allowed.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: {
        job: {
          company: {
            ownerId: session.user.id,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Fetch employer applications error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
