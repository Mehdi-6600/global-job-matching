import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const { success } = await ratelimit.limit(`subscribe:${email.toLowerCase().trim()}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.subscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { name: name || null, active: true },
      create: {
        email: email.toLowerCase().trim(),
        name: name || null,
      },
    });

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 201 });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
