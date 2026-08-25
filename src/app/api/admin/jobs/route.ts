import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== ROLES.ADMIN && session.user.role !== ROLES.OWNER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await db.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      postedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ jobs });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== ROLES.ADMIN && session.user.role !== ROLES.OWNER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, description, location, salary, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (salary !== undefined) updateData.salary = salary;
    if (type !== undefined) updateData.type = type;

    const job = await db.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Admin job update error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
