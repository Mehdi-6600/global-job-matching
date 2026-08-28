import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { normalizeApplicationStatus } from "@/lib/application-status";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (
    role !== ROLES.EMPLOYER &&
    role !== ROLES.ADMIN &&
    role !== ROLES.OWNER
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = normalizeApplicationStatus(body.status);

    if (!status) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await db.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            postedById: true,
            company: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isCompanyOwner =
      application.job.company?.ownerId === session.user.id;
    const isPoster = application.job.postedById === session.user.id;
    const isAdmin = role === ROLES.ADMIN || role === ROLES.OWNER;

    if (!isCompanyOwner && !isPoster && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.application.update({
      where: { id },
      data: { status },
    });

    await db.notification.create({
      data: {
        userId: application.userId,
        type: "application",
        title: "Application Status Updated",
        message: `Your application is now: ${status}`,
      },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Update application error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
