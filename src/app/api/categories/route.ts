import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public list of categories with at least one active job.
 *
 * Response shape:
 *   {
 *     categories: [
 *       { id: string; name: string; slug: string; count: number }
 *     ]
 *   }
 *
 * The client (jobs page) uses this to render a category filter
 * without embedding a hardcoded list. Localized labels are derived
 * client-side via `categoryLabel()` in `lib/i18n/category-labels`.
 *
 * No auth required: this is public discovery metadata.
 */
export async function GET() {
  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { jobs: { where: { status: "active" } } } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    const rows = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.jobs,
      }))
      .filter((c) => c.count > 0);

    return NextResponse.json(
      { categories: rows },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (err) {
    console.error("Categories GET error:", err);
    // Graceful degradation: return empty list rather than 500.
    return NextResponse.json(
      { categories: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
