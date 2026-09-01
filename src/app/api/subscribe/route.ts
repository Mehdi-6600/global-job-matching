import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ratelimit } from "@/lib/ratelimit";
import { subscribeSchema } from "@/lib/validation/subscribe";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email required", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const name = parsed.data.name?.trim() || null;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const { success } = await ratelimit.limit(`subscribe_${email}_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await db.subscriber.upsert({
      where: { email },
      update: { name, active: true },
      create: {
        email,
        name,
      },
    });

    return NextResponse.json(
      { message: "Subscribed successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
