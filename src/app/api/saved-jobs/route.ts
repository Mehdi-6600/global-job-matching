import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { normalizeLocation } from "@/lib/location";
import { getEffectivePlan } from "@/lib/subscription";
import { getRequestIp } from "@/lib/client-ip";
import { assertSavedJobQuota, lockUserRow } from "@/lib/quota";

const savedJobSchema = z
  .object({
    jobId: z.string().trim().min(1).max(100),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `savedjobs_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const savedJobs = await db.savedJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            salary: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            type: true,
            remote: true,
            experience: true,
            deadline: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            requirements: true,
            responsibilities: true,
            benefits: true,
            tags: true,
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
                location: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const jobs = savedJobs
      .filter((item) => item.job !== null)
      .map((item) => ({
        savedJobId: item.id,
        savedAt: item.createdAt,
        ...item.job,
        location: normalizeLocation(item.job!.location) || item.job!.location,
        company: item.job!.company
          ? {
              ...item.job!.company,
              location:
                normalizeLocation(item.job!.company.location) ||
                item.job!.company.location,
            }
          : null,
      }));

    return NextResponse.json({
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Saved jobs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved jobs" },
      { status: 500 }
    );
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
      `savedjobs_post_${session.user.id}_${ip}`
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

    const parsed = savedJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const jobId = parsed.data.jobId;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        deadline: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (
      job.status !== "active" ||
      (job.deadline && job.deadline.getTime() < Date.now())
    ) {
      return NextResponse.json(
        { error: "This job is no longer active." },
        { status: 409 }
      );
    }

    try {
      await db.$transaction(async (tx) => {
        await lockUserRow(tx, session.user.id);

        const existing = await tx.savedJob.findUnique({
          where: {
            userId_jobId: {
              userId: session.user.id,
              jobId,
            },
          },
          select: { id: true },
        });

        if (existing) {
          throw Object.assign(new Error("ALREADY_SAVED"), {
            status: 200,
            payload: { success: true, alreadySaved: true },
          });
        }

        const quota = await assertSavedJobQuota(tx, {
          userId: session.user.id,
          plan: effective.plan,
        });
        if (!quota.ok) {
          throw Object.assign(new Error(quota.code), {
            status: quota.status,
            payload: quota,
          });
        }

        await tx.savedJob.create({
          data: {
            userId: session.user.id,
            jobId,
          },
        });
      });
    } catch (error: unknown) {
      const e = error as {
        status?: number;
        payload?: Record<string, unknown>;
        code?: string;
      };
      if (e.status === 200 && e.payload) {
        return NextResponse.json(e.payload);
      }
      if (e.status && e.payload) {
        return NextResponse.json(e.payload, { status: e.status });
      }
      if (e.code === "P2002") {
        return NextResponse.json({ success: true, alreadySaved: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Save job error:", error);
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    );
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
      `savedjobs_delete_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = savedJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await db.savedJob.deleteMany({
      where: {
        userId: session.user.id,
        jobId: parsed.data.jobId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove saved job error:", error);
    return NextResponse.json(
      { error: "Failed to remove saved job" },
      { status: 500 }
    );
  }
}
