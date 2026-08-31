import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole, isEmployerRole } from "@/lib/roles";

const ALLOWED_STATUS = new Set([
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body || {};

    if (status != null && !ALLOWED_STATUS.has(String(status))) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const interview = await db.interview.findUnique({
      where: { id },
    });

    if (!interview || !interview.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const company = await db.company.findFirst({
      where: {
        id: interview.companyId,
        ownerId: session.user.id,
      },
    });

    if (!company && !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.interview.update({
      where: { id },
      data: {
        ...(status ? { status: String(status) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    if (status && status !== interview.status) {
      await db.notification.create({
        data: {
          userId: interview.userId,
          type: "interview",
          title: "Interview Updated",
          message: `Your interview status is now: ${status}`,
          actionUrl: "/dashboard",
        },
      });
    }

    return NextResponse.json({ interview: updated });
  } catch (error) {
    console.error("Update interview error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
