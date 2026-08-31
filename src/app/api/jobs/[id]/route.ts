import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";
import { jobUpdateSchema } from "@/lib/validation/job";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID required" },
        { status: 400 }
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
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        postedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const updated = await db.job.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        viewCount: true,
      },
    });

    const { _count, ...rest } = job;

    return NextResponse.json({
      job: {
        ...rest,
        location:
          normalizeLocation(job.location) ||
          job.location,

        viewCount: updated.viewCount,

        applicantCount: _count.applications,

        requirements:
          job.requirements || [],

        responsibilities:
          job.responsibilities || [],

        benefits:
          job.benefits || [],

        tags:
          job.tags || [],

        company: job.company
          ? {
              ...job.company,
              location:
                normalizeLocation(
                  job.company.location
                ),
            }
          : {
              id: "",
              name: "Unknown Company",
              location: null,
              logo: null,
              description: null,
              website: null,
            },
      },
    });
  } catch (error) {
    console.error("Job get error:", error);

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const isOwner =
      job.company?.ownerId === session.user.id;

    const isPoster =
      job.postedById === session.user.id;

    const isAdmin =
      isAdminRole(session.user.role);

    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed =
      jobUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details:
            parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = {
      ...parsed.data,
      location:
        parsed.data.location !== undefined
          ? normalizeLocation(
              parsed.data.location
            ) || parsed.data.location.trim()
          : undefined,
    };

    const updated = await db.job.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      job: {
        ...updated,
        location:
          normalizeLocation(updated.location) ||
          updated.location,
      },
    });
  } catch (error) {
    console.error("Job patch error:", error);

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const isOwner =
      job.company?.ownerId === session.user.id;

    const isPoster =
      job.postedById === session.user.id;

    const isAdmin =
      isAdminRole(session.user.role);

    if (!isOwner && !isPoster && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await db.job.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Job delete error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
