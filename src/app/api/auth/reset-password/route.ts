import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { hash } from "bcryptjs";

function verifyResetToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [userId, timestamp, hmac] = decoded.split(":");
    if (!userId || !timestamp || !hmac) return null;

    // Check expiry (1 hour)
    if (Date.now() - parseInt(timestamp) > 60 * 60 * 1000) return null;

    const data = `${userId}:${timestamp}`;
    const expectedHmac = createHmac("sha256", process.env.AUTH_SECRET!)
      .update(data)
      .digest("hex");
    if (hmac !== expectedHmac) return null;

    return userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Token and password (min 8 chars) required" },
        { status: 400 }
      );
    }

    const userId = verifyResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
