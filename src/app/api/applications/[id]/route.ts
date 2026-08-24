import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const validStatuses = ["applied", "viewed", "interview", "rejected", "hired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check ownership
    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { include: { company: { select: { email: true } } } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, role: true },
    });

    if (
      application.job.company.email !== user?.email &&
      user?.role !== "admin" &&
      user?.role !== "owner"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    // Create notification for applicant
    await prisma.notification.create({
      data: {
        userId: application.userId,
        type: "application",
        title: "Application Updated",
        description: `Your application status changed to "${status}"`,
        actionUrl: `/my-applications`,
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
