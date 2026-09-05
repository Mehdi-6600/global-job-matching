import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeLocation } from "@/lib/location";
import { jobIdSchema } from "@/lib/validation/job-id";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import {
  updateJobForUser,
  deleteJobForUser,
} from "@/services/jobs/update-job";

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

    const ip = getRequestIp(req);
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = await updateJobForUser(
      { id: session.user.id, role: session.user.role },
      id,
      body
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          details: result.details,
          limit: result.limit,
          used: result.used,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        ...result.job,
        location:
          normalizeLocation(result.job.location) || result.job.location,
      },
    });
  } catch (error) {
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

    const result = await deleteJobForUser(
      { id: session.user.id, role: session.user.role },
      id
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
