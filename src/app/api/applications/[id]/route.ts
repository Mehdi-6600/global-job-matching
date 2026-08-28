import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { normalizeApplicationStatus } from "@/lib/application-status";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const isCompanyOwner =
      application.job.company?.ownerId === session.user.id;
    const isPoster = application.job.postedById === session.user.id;
    const isAdmin =
      session.user.role === ROLES.ADMIN ||
      session.user.role === ROLES.OWNER;

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
        title: "Application Updated",
        message: `Your application status changed to "${status}"`,
      },
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
