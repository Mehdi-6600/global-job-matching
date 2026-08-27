import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { postedById: session.user.id },
          { company: { ownerId: session.user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        location: j.location,
        type: j.type,
        remote: j.remote,
        status: j.status,
        createdAt: j.createdAt,
        company: j.company,
        applicantCount: j._count.applications,
      })),
    });
  } catch (error) {
    console.error("Employer jobs list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  const allowed = [ROLES.EMPLOYER, ROLES.ADMIN, ROLES.OWNER];
  if (!allowed.includes(role as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.title || !body.description || !body.location || !body.type) {
      return NextResponse.json(
        { error: "Title, description, location and type are required" },
        { status: 400 }
      );
    }

    let companyId = body.companyId as string | undefined;

    if (!companyId) {
      const existing = await prisma.company.findFirst({
        where: { ownerId: session.user.id },
      });
      if (existing) {
        companyId = existing.id;
      } else {
        const created = await prisma.company.create({
          data: {
            name: body.companyName || "My Company",
            ownerId: session.user.id,
            email: session.user.email || null,
            status: "active",
          },
        });
        companyId = created.id;
      }
    } else {
      const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: session.user.id },
      });
      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
    }

    const job = await prisma.job.create({
      data: {
        title: String(body.title).trim(),
        description: String(body.description).trim(),
        location: String(body.location).trim(),
        type: String(body.type).trim(),
        remote: Boolean(body.remote),
        experience: body.experience || null,
        salaryMin:
          body.salaryMin != null && body.salaryMin !== ""
            ? Number(body.salaryMin)
            : null,
        salaryMax:
          body.salaryMax != null && body.salaryMax !== ""
            ? Number(body.salaryMax)
            : null,
        currency: (body.currency || "USD").toString().toUpperCase(),
        requirements: Array.isArray(body.requirements)
          ? body.requirements
          : [],
        responsibilities: Array.isArray(body.responsibilities)
          ? body.responsibilities
          : [],
        benefits: Array.isArray(body.benefits) ? body.benefits : [],
        tags: Array.isArray(body.tags)
          ? body.tags
          : typeof body.tags === "string"
            ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
            : [],
        companyId: companyId!,
        postedById: session.user.id,
        status: "active",
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
