import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Check if user is admin/owner
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  if (user?.role !== "admin" && user?.role !== "owner") return null;
  return session;
}

// GET /api/admin - Stats
export async function GET() {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalApplications,
      recentUsers,
      recentJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.company.count(),
      prisma.application.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.job.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: { totalUsers, totalJobs, totalCompanies, totalApplications },
      recentUsers,
      recentJobs,
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    const type = req.nextUrl.searchParams.get("type") || "user";

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (type === "user") {
      await prisma.user.delete({ where: { id } });
    } else if (type === "job") {
      await prisma.job.delete({ where: { id } });
    } else if (type === "company") {
      await prisma.company.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete" },
      { status: 500 }
    );
  }
}
