import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { rateLimitedResponse } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getRequestIp(req);
    const limit = await adminRatelimit.limit(
      `admin_overview_${session.user.id}_${ip}`
    );
    if (!limit.success) {
      return rateLimitedResponse(limit);
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
      pendingTransactions,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: last7Days } } }),
      db.user.count({ where: { createdAt: { gte: last30Days } } }),
      db.job.count(),
      db.job.count({ where: { createdAt: { gte: last7Days } } }),
      db.application.count(),
      db.application.count({ where: { createdAt: { gte: last7Days } } }),
      db.company.count(),
      db.subscriber.count(),
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
        totalApplications,
        newApplications7d,
        totalCompanies,
        totalSubscribers,
        totalTransactions,
        pendingTransactions,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}
