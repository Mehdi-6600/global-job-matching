import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isEmployerRole } from "@/lib/roles";
import { normalizeLocation } from "@/lib/location";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const jobs = await db.job.findMany({
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
        ...j,
        location: normalizeLocation(j.location) || j.location,
        applicantCount: j._count.applications,
      })),
    });
  } catch (error) {
    console.error("Employer jobs GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmployerRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const locationRaw =
      typeof body.location === "string" ? body.location.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "Full-time";

    if (title.length < 2 || description.length < 20 || locationRaw.length < 2) {
      return NextResponse.json(
        { error: "Title, description (min 20 chars), and location required" },
        { status: 400 }
      );
    }

    const location = normalizeLocation(locationRaw) || locationRaw;

    let companyId: string | null =
      typeof body.companyId === "string" ? body.companyId : null;

    if (companyId) {
      const owned = await db.company.findFirst({
        where: { id: companyId, ownerId: session.user.id },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Company not found or not owned by you" },
          { status: 403 }
        );
      }
    } else {
      const existing = await db.company.findFirst({
        where: { ownerId: session.user.id },
      });
      if (existing) {
        companyId = existing.id;
      } else {
        const name =
          typeof body.companyName === "string" && body.companyName.trim()
            ? body.companyName.trim()
            : "My Company";
        const created = await db.company.create({
          data: {
            name,
            ownerId: session.user.id,
            email: session.user.email || null,
            status: "active",
          },
        });
        companyId = created.id;
      }
    }

    const job = await db.job.create({
      data: {
        title,
        description,
        location,
        type,
        remote: Boolean(body.remote),
        experience:
          typeof body.experience === "string" ? body.experience : null,
        salaryMin:
          typeof body.salaryMin === "number" ? body.salaryMin : null,
        salaryMax:
          typeof body.salaryMax === "number" ? body.salaryMax : null,
        currency:
          typeof body.currency === "string" ? body.currency : "USD",
        status: "active",
        companyId,
        postedById: session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    console.error("Employer jobs POST error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
