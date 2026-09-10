import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/authz";
import { isAdminRole } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { parseListLimit, LIST_LIMITS } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const authz = await requireEmployer();
  if (!authz.ok) return authz.response;

  try {
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `employer_apps_get_${authz.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const take = parseListLimit(
      searchParams.get("limit"),
      LIST_LIMITS.adminList
    );

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
      take,
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

    return NextResponse.json({ applications, limit: take });
  } catch (error) {
    console.error("Fetch employer applications error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
