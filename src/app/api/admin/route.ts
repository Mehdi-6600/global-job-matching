import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== ROLES.ADMIN && session.user.role !== ROLES.OWNER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalTransactions,
      pendingTransactions,
      recentUsers,
      recentJobs,
    ] = await Promise.all([
      db.user.count(),
      db.job.count(),
      db.company.count(),
      db.transaction.count(),
      db.transaction.count({ where: { status: "pending" } }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      db.job.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalJobs,
        totalCompanies,
        totalTransactions,
        pendingTransactions,
      },
      recentUsers,
      recentJobs,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
  }
}
