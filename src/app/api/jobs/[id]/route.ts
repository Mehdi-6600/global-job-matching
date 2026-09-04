import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { jobUpdateSchema } from "@/lib/validation/job";
import { jobIdSchema } from "@/lib/validation/job-id";
import { ratelimit } from "@/lib/ratelimit";
import {
  assertCanCreateOrActivateJob,
  lockUserRow,
} from "@/services/jobs/active-job-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const parsedId = jobIdSchema.safeParse(rawId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }
    const id = parsedId.data;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { success } = await ratelimit.limit(`job_get_${id}_${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            location: true,
            logo: true,
            description: true,
            website: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
        postedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            location: true,
            logo: true,
            description: true,
            website: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
        postedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      job: {
        ...updated,
        location: normalizeLocation(updated.location) || updated.location,
        company: updated.company
          ? {
              ...updated.company,
              location:
                normalizeLocation(updated.company.location) ||
                updated.company.location,
            }
          : null,
        postedBy: updated.postedBy
          ? { id: updated.postedBy.id, name: updated.postedBy.name }
          : null,
      },
    });
  } catch (error) {
    console.error("Job GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const parsedId = jobIdSchema.safeParse(rawId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }
    const id = parsedId.data;

    const existing = await db.job.findUnique({
      where: { id },
      include: { company: { select: { ownerId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = existing.company?.ownerId === session.user.id;
    const isPoster = existing.postedById === session.user.id;
    const isAdmin = isAdminRole(session.user.role);

    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = jobUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = {
      ...parsed.data,
      location:
        parsed.data.location !== undefined
          ? normalizeLocation(parsed.data.location) ||
            parsed.data.location.trim()
          : undefined,
    };

    const becomingActive =
      data.status === "active" && existing.status !== "active";

    const updated = await db.$transaction(async (tx) => {
      if (becomingActive && !isAdmin) {
        const ownerId =
          existing.company?.ownerId || existing.postedById || session.user.id;

        await lockUserRow(tx, ownerId);

        const owner = await tx.user.findUnique({
          where: { id: ownerId },
          select: { plan: true },
        });

        const limitError = await assertCanCreateOrActivateJob(tx, {
          userId: ownerId,
          plan: owner?.plan,
          excludeJobId: id,
        });

        if (limitError) {
          throw Object.assign(new Error(limitError.code), {
            status: 403,
            payload: limitError,
          });
        }
      }

      return tx.job.update({
        where: { id },
        data,
      });
    });

    return NextResponse.json({
      success: true,
      job: {
        ...updated,
        location: normalizeLocation(updated.location) || updated.location,
      },
    });
  } catch (error: unknown) {
    const e = error as {
      status?: number;
      payload?: {
        error: string;
        code?: string;
        limit?: number;
        used?: number;
      };
    };

    if (e?.status === 403 && e.payload) {
      return NextResponse.json(e.payload, { status: 403 });
    }

    console.error("Job PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const parsedId = jobIdSchema.safeParse(rawId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }
    const id = parsedId.data;

    const job = await db.job.findUnique({
      where: { id },
      include: { company: { select: { ownerId: true } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = job.company?.ownerId === session.user.id;
    const isPoster = job.postedById === session.user.id;
    const isAdmin = isAdminRole(session.user.role);

    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.job.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
