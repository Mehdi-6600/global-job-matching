import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/roles";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import {
  jobStatusSchema,
} from "@/lib/validation/job";

const adminJobUpdateSchema = z.object({
  id: z.string().min(1),

  title: z.string().min(2).max(200).optional(),

  description:
    z.string().min(20).max(20000).optional(),

  location:
    z.string().min(2).max(200).optional(),

  salary:
    z.string().max(100).nullable().optional(),

  type:
    z.string().min(1).max(50).optional(),

  status:
    jobStatusSchema.optional(),
});

function isAdminOrOwner(
  role: string | undefined
): boolean {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.OWNER
  );
}

export async function GET() {
  try {
    const session = await auth();

    if (
      !session?.user?.id ||
      !isAdminOrOwner(session.user.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const jobs = await db.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        postedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      jobs,
    });
  } catch (error) {
    console.error(
      "Admin jobs fetch error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch jobs",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest
) {
  try {
    const session = await auth();

    if (
      !session?.user?.id ||
      !isAdminOrOwner(session.user.role)
    ) {
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
        {
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    const parsed =
      adminJobUpdateSchema.safeParse(body);

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

    const {
      id,
      title,
      description,
      location,
      salary,
      type,
      status,
    } = parsed.data;

    const existing =
      await db.job.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error: "Job not found",
        },
        { status: 404 }
      );
    }

    const updateData: {
      title?: string;
      description?: string;
      location?: string;
      salary?: string | null;
      type?: string;
      status?: string;
    } = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description =
        description;
    }

    if (location !== undefined) {
      updateData.location =
        normalizeLocation(location) ||
        location.trim();
    }

    if (salary !== undefined) {
      updateData.salary = salary;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No fields to update",
        },
        { status: 400 }
      );
    }

    const job = await db.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error(
      "Admin job update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update job",
      },
      { status: 500 }
    );
  }
}
