import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Layers } from "lucide-react";
import { db } from "@/lib/db";
import {
  buildPublicMetadata,
  jsonLdScript,
} from "@/lib/seo/core";
import { itemListJsonLd } from "@/lib/seo/json-ld";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import {
  CategoriesSearch,
  type CategoryRow,
} from "@/components/categories/CategoriesSearch";

export const revalidate = 300;

function categoryDisplayName(
  dict: ReturnType<typeof getDictionary>,
  slug: string,
  fallbackName: string
): string {
  return t(dict, `CategoryNames.${slug}`, fallbackName);
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const title = t(dict, "Categories.title", "Jobs by category");
  const description = t(
    dict,
    "Categories.subtitle",
    "Only categories that currently have active jobs are shown."
  );

  return buildPublicMetadata({
    title,
    description,
    path: "/categories",
    index: true,
    hreflang: true,
    locale,
  });
}

export default async function CategoriesIndexPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  let rows: CategoryRow[] = [];

  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { jobs: { where: { status: "active" } } } },
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    rows = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.jobs,
        displayName: categoryDisplayName(dict, c.slug, c.name),
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        })
      );
  } catch (e) {
    console.error("Categories index error:", e);
  }

  const title = t(dict, "Categories.title", "Jobs by category");
  const subtitle = t(
    dict,
    "Categories.subtitle",
    "Only categories that currently have active jobs are shown."
  );
  const empty = t(
    dict,
    "Categories.empty",
    "No categories with active jobs yet."
  );
  const browseJobs = t(dict, "Categories.browseJobs", "Browse jobs");
  const viewAll = t(dict, "Categories.viewAllJobs", "View all jobs →");
  const browseLoc = t(dict, "Categories.browseLocations", "Browse locations →");
  const activeJobsLabel = t(dict, "Categories.activeJobs", "active jobs");
  const searchPlaceholder = t(
    dict,
    "Categories.searchPlaceholder",
    "Search categories…"
  );
  const noResults = t(
    dict,
    "Categories.noResults",
    "No categories match your search."
  );
  const clearLabel = t(dict, "Categories.clearSearch", "Clear");

  const listLd = itemListJsonLd({
    name: title,
    description: subtitle,
    path: "/categories",
    items: rows.map((c) => ({
      name: c.displayName,
      path: `/categories/${c.slug}`,
    })),
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(listLd) }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Layers className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">{subtitle}</p>
        </div>

        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10 text-slate-400">
            {empty}{" "}
            <Link href="/jobs" className="text-cyan-400 hover:underline">
              {browseJobs}
            </Link>
          </div>
        ) : (
          <CategoriesSearch
            rows={rows}
            searchPlaceholder={searchPlaceholder}
            activeJobsLabel={activeJobsLabel}
            noResults={noResults}
            clearLabel={clearLabel}
          />
        )}

        <p className="text-center mt-10 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/jobs" className="text-indigo-400 hover:underline">
            {viewAll}
          </Link>
          <Link href="/locations" className="text-indigo-400 hover:underline">
            {browseLoc}
          </Link>
        </p>
      </div>
    </main>
  );
}
