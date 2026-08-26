import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["employer", "admin", "owner"];
  if (!allowed.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    const valid = ["applied", "viewed", "interview", "hired", "rejected"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await prisma.application.findFirst({
      where: {
        id,
        job: { company: { ownerId: session.user.id } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    await prisma.notification.create({
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
