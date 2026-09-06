import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployer } from "@/lib/authz";
import { getManagedApplication } from "@/lib/ownership";
import { normalizeApplicationStatus } from "@/lib/application-status";
import { applicationStatusUpdateSchema } from "@/lib/validation/application-status-update";
import { ratelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireEmployer();
  if (!authz.ok) return authz.response;

  try {
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `employer_app_patch_${authz.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = applicationStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const status = normalizeApplicationStatus(parsed.data.status);
    if (!status) {
      return NextResponse.json(
        { error: "Invalid application status" },
        { status: 400 }
      );
    }

    const application = await getManagedApplication(
      db,
      id,
      authz.user.id,
      authz.user.role
    );

    if (!application) {
      // Same response for not-found and not-owned → avoid IDOR probing
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (application.status === status) {
      return NextResponse.json({
        success: true,
        application,
        changed: false,
      });
    }

    const jobTitle = application.job.title || "a job";
    const companyName = application.job.company?.name;
    const where = companyName ? ` at ${companyName}` : "";

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status },
      });

      await tx.notification.create({
        data: {
          userId: application.userId,
          type: "application",
          title: "Application Status Updated",
          message: `Your application for "${jobTitle}"${where} is now: ${status}.`,
          actionUrl: "/my-applications",
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      application: result,
      changed: true,
    });
  } catch (error) {
    console.error("Employer application PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
