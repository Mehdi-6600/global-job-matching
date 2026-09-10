import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import {
  jobAlertCreateSchema,
  jobAlertDeleteSchema,
} from "@/lib/validation/job-alert";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import { assertJobAlertQuota, lockUserRow } from "@/lib/quota";
import { parseListLimit, LIST_LIMITS } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `job_alerts_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const take = parseListLimit(
      searchParams.get("limit"),
      LIST_LIMITS.userList
    );

    const alerts = await db.jobAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ alerts, limit: take });
  } catch (error) {
    console.error("Job alerts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `job_alerts_post_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const effective = await getEffectivePlan(session.user.id);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = jobAlertCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { keywords, location, remote, type, minSalary, frequency } =
      parsed.data as {
        keywords?: string | null;
        location?: string | null;
        remote?: boolean | null;
        type?: string | null;
        minSalary?: number | null;
        frequency?: string | null;
      };

    const keywordParts = [
      keywords?.trim() || null,
      type?.trim() ? `type:${type.trim()}` : null,
      minSalary != null ? `minSalary:${minSalary}` : null,
    ].filter(Boolean);

    try {
      const alert = await db.$transaction(async (tx) => {
        await lockUserRow(tx, session.user.id);

        const quota = await assertJobAlertQuota(tx, {
          userId: session.user.id,
          plan: effective.plan,
        });
        if (!quota.ok) {
          throw Object.assign(new Error(quota.code), {
            status: quota.status,
            payload: quota,
          });
        }

        return tx.jobAlert.create({
          data: {
            userId: session.user.id,
            keywords: keywordParts.length > 0 ? keywordParts.join(" ") : null,
            location: location ?? null,
            remote: remote ?? null,
            frequency: frequency?.trim() || "daily",
            active: true,
          },
        });
      });

      return NextResponse.json({ alert }, { status: 201 });
    } catch (error: unknown) {
      const e = error as { status?: number; payload?: Record<string, unknown> };
      if (e.status && e.payload) {
        return NextResponse.json(e.payload, { status: e.status });
      }
      throw error;
    }
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `job_alerts_delete_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const id = new URL(req.url).searchParams.get("id");
    const parsed = jobAlertDeleteSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const result = await db.jobAlert.deleteMany({
      where: { id: parsed.data.id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
