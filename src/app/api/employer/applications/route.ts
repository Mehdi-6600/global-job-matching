import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/authz";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  const authz = await requireEmployer();
  if (!authz.ok) return authz.response;

  try {
    const isAdmin = isAdminRole(authz.user.role);

    const applications = await db.application.findMany({
      where: isAdmin
        ? {}
        : {
            job: {
              OR: [
                { company: { ownerId: authz.user.id } },
                { postedById: authz.user.id },
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
