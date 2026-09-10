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
import { canViewJobDetail } from "@/lib/jobs/public-visibility";
import { rateLimitedResponse, readJsonBody } from "@/lib/http";

const VIEW_COOKIE_PREFIX = "jv_";
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

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
    const limit = await ratelimit.limit(`job_get_${id}_${ip}`);
    if (!limit.success) {
      return rateLimitedResponse(limit);
    }

    const session = await auth();
    const viewerId = session?.user?.id ?? null;
    const viewerRole = session?.user?.role ?? null;

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
            ownerId: true,
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

    const allowed = canViewJobDetail({
      jobStatus: job.status,
      postedById: job.postedById,
      companyOwnerId: job.company?.ownerId ?? null,
      viewerId,
      viewerRole,
    });

    if (!allowed) {
      // Same as missing — avoid leaking existence of drafts to strangers
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cookieName = `${VIEW_COOKIE_PREFIX}${id}`;
    const alreadyViewed = req.cookies.get(cookieName)?.value === "1";

    let viewCount = job.viewCount;

    if (!alreadyViewed && job.status === "active") {
      try {
        const updated = await db.job.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
          select: { viewCount: true },
        });
        viewCount = updated.viewCount;
      } catch {
        // non-fatal
      }
    }

    // Never expose ownerId on public payloads
    const { ownerId: _ownerId, ...companyPublic } = job.company || {
      ownerId: null,
    };

    const payload = {
      job: {
        ...job,
        viewCount,
        location: normalizeLocation(job.location) || job.location,
        company: job.company
          ? {
              ...companyPublic,
              location:
                normalizeLocation(job.company.location) ||
                job.company.location,
            }
          : null,
      },
    };

    const res = NextResponse.json(payload);

    if (!alreadyViewed && job.status === "active") {
      res.cookies.set(cookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: VIEW_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    return res;
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

    const body = await readJsonBody(req);
    if (body === null) {
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
