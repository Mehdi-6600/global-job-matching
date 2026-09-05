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

    const alerts = await db.jobAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
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

    const body = await req.json();
    const parsed = jobAlertCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { keywords, location, remote, type, minSalary } = parsed.data;

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
            keywords: keywords ?? null,
            location: location ?? null,
            remote: remote ?? null,
            type: type ?? null,
            minSalary: minSalary ?? null,
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
