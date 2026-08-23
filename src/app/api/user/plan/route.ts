import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        status: "confirmed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      plan: transaction?.planId || "free",
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
