import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";

/**
 * Seed is always disabled in production.
 * Development requires Authorization: Bearer <SEED_SECRET>
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.SEED_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "SEED_SECRET is not configured" },
      { status: 503 }
    );
  }

  if (!isAuthorizedBearerSecret(req, secret)) {
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
