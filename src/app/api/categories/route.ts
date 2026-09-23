import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoryLabel } from "@/lib/i18n/category-labels";
import { locales, type Locale } from "@/lib/i18n/config";

/**
 * Public list of categories with at least one active job.
 *
 * Response shape:
 *   {
 *     categories: [
 *       {
 *         id: string;
 *         name: string;         // raw DB name (English by default)
 *         slug: string;         // stable identifier
 *         count: number;        // active jobs in this category
 *         labels: {             // precomputed localized labels
 *           en: string;
 *           fa: string;
 *           ar: string;
 *           es: string;
 *           fr: string;
 *           de: string;
 *           hi: string;
 *         };
 *       }
 *     ]
 *   }
 *
 * The client picks `labels[locale]` — no client-side mapping needed.
 */
export async function GET() {
  try {
    const rows = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { jobs: { where: { status: "active" } } } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    const categories = rows
      .map((c) => {
        const labels = {} as Record<Locale, string>;
        for (const loc of locales) {
          labels[loc] = categoryLabel(c.slug, c.name, loc);
        }
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c._count.jobs,
          labels,
        };
      })
      .filter((c) => c.count > 0);

    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (err) {
    console.error("Categories GET error:", err);
    return NextResponse.json(
      { categories: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
