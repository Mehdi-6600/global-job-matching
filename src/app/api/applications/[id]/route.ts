import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";

const VALID = ["pending", "viewed", "interview", "rejected", "hired"] as const;

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
    const status = body.status as string;

    if (!VALID.includes(status as any)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await db.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            company: { select: { ownerId: true, email: true } },
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
    const isCompanyEmail =
      !!application.job.company?.email &&
      application.job.company.email === session.user.email;

    if (!isCompanyOwner && !isPoster && !isAdmin && !isCompanyEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.application.update({
      where: { id },
      data: { status },
    });

    try {
      await db.notification.create({
        data: {
          userId: application.userId,
          type: "application",
          title: "Application Updated",
          message: `Your application status changed to "${status}"`,
          description: `Status: ${status}`,
          actionUrl: `/jobs/${application.jobId}`,
        },
      });
    } catch (nErr) {
      console.error("Notification create failed:", nErr);
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}
