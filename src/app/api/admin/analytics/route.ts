import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== ROLES.ADMIN && session.user.role !== ROLES.OWNER)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    totalJobs,
    newJobs7d,
    totalCompanies,
    totalTransactions,
    pendingTransactions,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: last7Days } } }),
    db.user.count({ where: { createdAt: { gte: last30Days } } }),
    db.job.count(),
    db.job.count({ where: { createdAt: { gte: last7Days } } }),
    db.company.count(),
    db.transaction.count(),
    db.transaction.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsers7d,
      newUsers30d,
      totalJobs,
      newJobs7d,
      totalCompanies,
      totalTransactions,
      pendingTransactions,
    },
  });
}
