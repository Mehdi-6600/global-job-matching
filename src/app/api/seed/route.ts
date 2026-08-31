import { NextRequest, NextResponse } from "next/server";

/**
 * Seed is disabled in production always.
 * In development requires Authorization: Bearer <SEED_SECRET>
 * Never uses a hardcoded fallback secret in production paths.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET is not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: false,
    message:
      "Inline seed is disabled. Use: npx prisma db seed (local/CI only).",
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
