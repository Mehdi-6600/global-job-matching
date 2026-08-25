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

  try {
    const { id } = await params;
    const { status, meetLink, notes } = await req.json();

    const interview = await prisma.interview.findFirst({
      where: {
        id,
        job: { company: { ownerId: session.user.id } },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: status || undefined,
        meetLink: meetLink !== undefined ? meetLink : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    if (status && status !== interview.status) {
      await prisma.notification.create({
        data: {
          userId: interview.userId,
          type: "interview",
          title: "Interview Updated",
          description: `Your interview status is now: ${status}`,
          actionUrl: "/my-interviews",
        },
      });
    }

    return NextResponse.json({ interview: updated });
  } catch (error) {
    console.error("Update interview error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
