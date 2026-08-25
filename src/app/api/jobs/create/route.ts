import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, location, salary, type, companyId } = body;

    if (!title || !description || !location || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let finalCompanyId: string | null = companyId || null;

    if (session.user.role === ROLES.EMPLOYER) {
      if (!companyId) {
        return NextResponse.json({ error: "Company ID required for employers" }, { status: 400 });
      }
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      if (company.ownerId !== session.user.id) {
        return NextResponse.json({ error: "You do not own this company" }, { status: 403 });
      }
      finalCompanyId = company.id;
    } else if (session.user.role === ROLES.ADMIN || session.user.role === ROLES.OWNER) {
      if (companyId) {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
          return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }
        finalCompanyId = company.id;
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        salary: salary || null,
        type,
        companyId: finalCompanyId,
        postedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
