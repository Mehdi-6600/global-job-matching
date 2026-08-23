import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.title || !body.description || !body.companyName) {
      return NextResponse.json(
        { error: "Title, description and company name are required" },
        { status: 400 }
      );
    }

    // Find or create company
    let company = await prisma.company.findFirst({
      where: { name: body.companyName },
    });

    if (!company) {
      const slug =
        body.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now();

      company = await prisma.company.create({
        data: {
          name: body.companyName,
          slug,
          email: session.user.email || "unknown@example.com",
          location: body.location || "Remote",
          status: "verified",
        },
      });
    }

    const job = await prisma.job.create({
      data: {
        title: body.title,
        description: body.description,
        location: body.location || "Remote",
        remote: body.remote || false,
        type: body.type || "full-time",
        experience: body.experience || "mid",
        salaryMin: body.salaryMin ? Number(body.salaryMin) : null,
        salaryMax: body.salaryMax ? Number(body.salaryMax) : null,
        currency: body.currency || "USD",
        requirements: body.requirements?.filter(Boolean) || [],
        responsibilities: body.responsibilities?.filter(Boolean) || [],
        benefits: body.benefits?.filter(Boolean) || [],
        tags: body.tags?.filter(Boolean) || [],
        status: "active",
        companyId: company.id,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("Create job error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create job" },
      { status: 500 }
    );
  }
}
