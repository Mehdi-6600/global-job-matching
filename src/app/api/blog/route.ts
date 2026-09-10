import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListLimit, LIST_LIMITS } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const take = parseListLimit(
      searchParams.get("limit"),
      LIST_LIMITS.userList
    );

    const posts = await db.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ posts, limit: take });
  } catch (error) {
    console.error("Blog list error:", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}
