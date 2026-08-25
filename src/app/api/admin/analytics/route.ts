import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "owner"].includes(session.user.role || "")) {
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
    totalApplications,
    newApplications7d,
    totalCompanies,
    totalSubscribers,
    totalTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.job.count(),
    prisma.job.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.application.count(),
    prisma.application.count({ where: { createdAt: { gte: last7Days } } }),
    prisma.company.count(),
    prisma.subscriber.count(),
    prisma.transaction.count(),
  ]);

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsers7d,
      newUsers30d,
      totalJobs,
      newJobs7d,
      totalApplications,
      newApplications7d,
      totalCompanies,
      totalSubscribers,
      totalTransactions,
    },
  });
}
