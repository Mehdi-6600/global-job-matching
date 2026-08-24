import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        website: true,
        location: true,
        size: true,
        description: true,
        logo: true,
        status: true,
        createdAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch company" },
      { status: 500 }
    );
  }
}
