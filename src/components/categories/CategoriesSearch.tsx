"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

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
  const { t } = useLocale();
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
          className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] ps-10 pe-24 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-[var(--brand-accent)]"
          aria-label={searchPlaceholder}
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--surface-3)]"
          >
            {clearLabel}
          </button>
        ) : null}
      </div>

      {letters.length > 1 ? (
        <nav
          className="flex flex-wrap gap-1.5 justify-center"
          aria-label={t("Categories.alphabet", "Alphabet")}
        >
          {letters.map((L) => (
            <a
              key={L}
              href={`#cat-${L === "#" ? "other" : L}`}
              className="min-w-[2rem] text-center text-xs font-medium rounded-lg px-2 py-1.5 border border-[var(--border)] text-[var(--text-body)] hover:text-[var(--text-primary)] hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent-soft)] transition-colors"
            >
              {L}
            </a>
          ))}
        </nav>
      ) : null}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-[var(--border)] text-[var(--text-muted)]">
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
                <h2 className="text-sm font-semibold text-[var(--brand-accent)] mb-3 tracking-wide">
                  {L}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {items.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/categories/${c.slug}`}
                        className="glass block rounded-2xl border border-[var(--border)] p-5 hover:border-[var(--brand-accent)] transition-all"
                      >
                        <span className="text-lg font-semibold text-[var(--text-primary)]">
                          {c.displayName}
                        </span>
                        <span className="block text-sm text-[var(--text-muted)] mt-1">
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
