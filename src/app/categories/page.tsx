import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site-url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Jobs by category",
  description:
    "Browse active jobs by category on Global Job Matching. Categories are only listed when they have open roles.",
  alternates: { canonical: absoluteUrl("/categories") },
  openGraph: {
    title: "Jobs by category | Global Job Matching",
    description: "Explore open roles by job category with live counts.",
    url: absoluteUrl("/categories"),
  },
};

export default async function CategoriesIndexPage() {
  let rows: Array<{ id: string; name: string; slug: string; count: number }> =
    [];

  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { jobs: { where: { status: "active" } } } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });
    rows = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.jobs,
      }))
      .filter((c) => c.count > 0);
  } catch (e) {
    console.error("Categories index error:", e);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Layers className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">
            Jobs by category
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Only categories that currently have active jobs are shown.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10 text-slate-400">
            No categories with active jobs yet.{" "}
            <Link href="/jobs" className="text-cyan-400 hover:underline">
              Browse all jobs
            </Link>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="glass block rounded-2xl border border-white/10 p-5 hover:border-indigo-500/30 transition-all"
                >
                  <span className="text-lg font-semibold text-white">
                    {c.name}
                  </span>
                  <span className="block text-sm text-slate-400 mt-1">
                    {c.count} active job{c.count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
