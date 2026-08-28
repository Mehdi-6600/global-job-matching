import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole, isEmployerRole } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const isAdmin = isAdminRole(session.user.role);

    const applications = await db.application.findMany({
      where: isAdmin
        ? {}
        : {
            job: {
              OR: [
                { company: { ownerId: session.user.id } },
                { postedById: session.user.id },
              ],
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
