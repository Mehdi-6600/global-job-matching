import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { normalizeApplicationStatus } from "@/lib/application-status";
import { applicationUpdateSchema } from "@/lib/validation/application";
import {
  canManageJob,
  getManagedApplication,
  getOwnApplication,
} from "@/lib/ownership";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

/**
 * GET — applicant can read own application; employer/admin can read managed ones.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `app_get_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const own = await getOwnApplication(db, id, session.user.id);
    if (own) {
      return NextResponse.json({ application: own });
    }

    const managed = await getManagedApplication(
      db,
      id,
      session.user.id,
      session.user.role
    );
    if (managed) {
      return NextResponse.json({ application: managed });
    }

    // Do not leak existence to unrelated users
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Get application error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PUT — only employer/poster/admin may change status (not the applicant).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `app_put_${session.user.id}_${ip}`
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

    const parsed = applicationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const normalizedStatus = normalizeApplicationStatus(parsed.data.status);
    if (!normalizedStatus) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await getManagedApplication(
      db,
      id,
      session.user.id,
      session.user.role
    );

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      normalizeApplicationStatus(application.status) === normalizedStatus
    ) {
      return NextResponse.json({
        success: true,
        application,
        unchanged: true,
      });
    }

    const jobTitle = application.job.title || "a job";
    const companyName = application.job.company?.name;
    const where = companyName ? ` at ${companyName}` : "";

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: normalizedStatus },
      });

      await tx.notification.create({
        data: {
          userId: application.userId,
          type: "application",
          title: "Application Updated",
          message: `Your application for "${jobTitle}"${where} is now: ${normalizedStatus}.`,
          actionUrl: "/my-applications",
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, application: result });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — applicant may withdraw own application; employer/admin may remove.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `app_del_${session.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const application = await db.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        job: {
          select: {
            postedById: true,
            company: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = application.userId === session.user.id;
    const isManager = canManageJob(
      session.user.id,
      session.user.role,
      application.job
    );

    if (!isOwner && !isManager && !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.application.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Application removed" });
  } catch (error) {
    console.error("Delete application error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
