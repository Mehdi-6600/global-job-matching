import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = ["employer", "admin", "owner"];
  if (!allowed.includes(session.user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const company = await prisma.company.findFirst({
      where: { id: body.companyId, ownerId: session.user.id },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const job = await prisma.job.create({
      data: {
        title: body.title,
        description: body.description,
        location: body.location,
        remote: body.remote || false,
        type: body.type,
        experience: body.experience,
        salaryMin: body.salaryMin ? parseInt(body.salaryMin) : null,
        salaryMax: body.salaryMax ? parseInt(body.salaryMax) : null,
        currency: body.currency || "USD",
        requirements: body.requirements || [],
        responsibilities: body.responsibilities || [],
        benefits: body.benefits || [],
        tags: body.tags || [],
        deadline: body.deadline ? new Date(body.deadline) : null,
        companyId: body.companyId,
        categoryId: body.categoryId || null,
      },
    });

    // Check job alerts and notify matching users
    const alerts = await prisma.jobAlert.findMany({
      where: {
        active: true,
        AND: [
          {
            OR: [
              { keywords: null },
              { keywords: { contains: body.title, mode: "insensitive" } },
            ],
          },
          {
            OR: [
              { location: null },
              { location: { contains: body.location, mode: "insensitive" } },
            ],
          },
          {
            OR: [
              { remote: null },
              { remote: body.remote },
            ],
          },
          {
            OR: [
              { type: null },
              { type: body.type },
            ],
          },
        ],
      },
    });

    for (const alert of alerts) {
      let matches = true;
      if (alert.keywords && !body.title.toLowerCase().includes(alert.keywords.toLowerCase())) matches = false;
      if (alert.location && !body.location.toLowerCase().includes(alert.location.toLowerCase())) matches = false;
      if (alert.remote !== null && alert.remote !== body.remote) matches = false;
      if (alert.type && alert.type !== body.type) matches = false;
      if (alert.minSalary && body.salaryMax && body.salaryMax < alert.minSalary) matches = false;

      if (matches) {
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            type: "job",
            title: "New Job Match!",
            description: `${job.title} at ${company.name} matches your alert.`,
            actionUrl: `/jobs/${job.id}`,
          },
        });
      }
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
