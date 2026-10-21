"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  count: number;
  displayName: string;
};

type Props = {
  rows: CategoryRow[];
  searchPlaceholder: string;
  activeJobsLabel: string;
  noResults: string;
  clearLabel: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function CategoriesSearch({
  rows,
  searchPlaceholder,
  activeJobsLabel,
  noResults,
  clearLabel,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = normalize(q);
    if (!n) return rows;
    return rows.filter((r) => {
      const hay = normalize(`${r.displayName} ${r.name} ${r.slug}`);
      return hay.includes(n);
    });
  }, [rows, q]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      const ch = normalize(r.displayName).charAt(0);
      if (ch >= "a" && ch <= "z") set.add(ch.toUpperCase());
      else if (ch) set.add("#");
    }
    return Array.from(set).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryRow[]>();
    for (const r of filtered) {
      const ch = normalize(r.displayName).charAt(0);
      const key =
        ch >= "a" && ch <= "z" ? ch.toUpperCase() : "#";
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-24 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/40"
          aria-label={searchPlaceholder}
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
          >
            {clearLabel}
          </button>
        ) : null}
      </div>

      {letters.length > 1 ? (
        <nav
          className="flex flex-wrap gap-1.5 justify-center"
          aria-label="Alphabet"
        >
          {letters.map((L) => (
            <a
              key={L}
              href={`#cat-${L === "#" ? "other" : L}`}
              className="min-w-[2rem] text-center text-xs font-medium rounded-lg px-2 py-1.5 border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-colors"
            >
              {L}
            </a>
          ))}
        </nav>
      ) : null}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-white/10 text-slate-400">
          {noResults}
        </div>
      ) : (
        <div className="space-y-8">
          {letters.map((L) => {
            const items = grouped.get(L) ?? [];
            if (!items.length) return null;
            const anchor = L === "#" ? "other" : L;
            return (
              <section key={L} id={`cat-${anchor}`} className="scroll-mt-24">
                <h2 className="text-sm font-semibold text-indigo-300 mb-3 tracking-wide">
                  {L}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {items.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/categories/${c.slug}`}
                        className="glass block rounded-2xl border border-white/10 p-5 hover:border-indigo-500/30 transition-all"
                      >
                        <span className="text-lg font-semibold text-white">
                          {c.displayName}
                        </span>
                        <span className="block text-sm text-slate-400 mt-1">
                          {c.count} {activeJobsLabel}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
