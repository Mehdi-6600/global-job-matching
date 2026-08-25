import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";

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
    const { status } = await req.json();

    const validStatuses = ["pending", "viewed", "interview", "rejected", "hired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await db.application.findUnique({
      where: { id },
      include: { job: { include: { company: { select: { ownerId: true } } } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check ownership: company owner, admin, or owner
    const isCompanyOwner = application.job.company?.ownerId === session.user.id;
    const isAdmin = session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER;

    if (!isCompanyOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.application.update({
      where: { id },
      data: { status },
    });

    // Create notification for applicant
    await db.notification.create({
      data: {
        userId: application.userId,
        type: "application",
        title: "Application Updated",
        message: `Your application status changed to "${status}"`,
      },
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}
