import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "owner"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
    },
  });

  return NextResponse.json({ jobs });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !["admin", "owner"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, status } = await req.json();
    const job = await prisma.job.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
