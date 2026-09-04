import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

const trackSchema = z
  .object({
    path: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine((p) => p.startsWith("/"), "path must start with /"),
    referrer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);

    const { success } = await ratelimit.limit(`analytics_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const session = await auth();
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

    await db.analyticsEvent.create({
      data: {
        path: parsed.data.path,
        referrer: parsed.data.referrer || null,
        userId: session?.user?.id || null,
        ipHash: hashIp(ip),
        userAgent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const daysParam = Number(req.nextUrl.searchParams.get("days") || "7");
    const days = Number.isFinite(daysParam)
      ? Math.min(90, Math.max(1, Math.trunc(daysParam)))
      : 7;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const [total, topPaths, recent] = await Promise.all([
      db.analyticsEvent.count({
        where: { createdAt: { gte: since } },
      }),
      db.analyticsEvent.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since } },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 20,
      }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          path: true,
          referrer: true,
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      days,
      totalViews: total,
      topPaths: topPaths.map((row) => ({
        path: row.path,
        views: row._count.path,
      })),
      recent,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
