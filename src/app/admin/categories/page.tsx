"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Search,
  Briefcase,
  Save,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface Category {
  id: string;
  name: string;
  slug: string;
  jobCount: number;
  color: string;
}

const initialCategories: Category[] = [
  { id: "c1", name: "Technology", slug: "technology", jobCount: 156, color: "bg-[var(--brand-primary)]" },
  { id: "c2", name: "Design", slug: "design", jobCount: 48, color: "bg-[var(--brand-accent)]" },
  { id: "c3", name: "Marketing", slug: "marketing", jobCount: 32, color: "bg-[var(--warning)]" },
  { id: "c4", name: "Finance", slug: "finance", jobCount: 24, color: "bg-[var(--success)]" },
  { id: "c5", name: "Healthcare", slug: "healthcare", jobCount: 18, color: "bg-[var(--error)]" },
  { id: "c6", name: "Education", slug: "education", jobCount: 12, color: "bg-[var(--warning)]" },
  { id: "c7", name: "Sales", slug: "sales", jobCount: 28, color: "bg-[var(--info)]" },
  { id: "c8", name: "HR", slug: "hr", jobCount: 9, color: "bg-[var(--brand-primary)]" },
];

const colorOptions = [
  "bg-[var(--brand-primary)]",
  "bg-[var(--info)]",
  "bg-[var(--brand-accent)]",
  "bg-[var(--warning)]",
  "bg-[var(--success)]",
  "bg-[var(--brand-primary)]",
  "bg-[var(--warning)]",
  "bg-[var(--error)]",
  "bg-[var(--warning)]",
  "bg-[var(--brand-accent)]",
];

export default function AdminCategoriesPage() {
  const { t } = useLocale();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", color: "bg-[var(--brand-primary)]" });

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newCat: Category = {
      id: Date.now().toString(),
      name: form.name.trim(),
      slug: form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, "-"),
      jobCount: 0,
      color: form.color,
    };
    setCategories([...categories, newCat]);
    setForm({ name: "", slug: "", color: "bg-[var(--brand-primary)]" });
    setIsAdding(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, color: cat.color });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: form.name.trim(),
              slug: form.slug.trim(),
              color: form.color,
            }
          : c
      )
    );
    setEditingId(null);
    setForm({ name: "", slug: "", color: "bg-[var(--brand-primary)]" });
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ name: "", slug: "", color: "bg-[var(--brand-primary)]" });
  };

  return (
    <div className="gjm-page px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-1">
              {t("Jobs.category", "Categories")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Dashboard.welcomeSub", "Manage job categories and tags")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[image:var(--gradient-brand)] text-[var(--text-primary)] px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            {t("Common.add", "Add Category")}
          </button>
        </div>

        <div className="glass rounded-2xl p-4 mb-6 border border-[var(--border)]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Common.search", "Search categories...")}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl ps-10 pe-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        {(isAdding || editingId) && (
          <div className="glass rounded-2xl p-5 md:p-6 mb-6 border border-[var(--border)]">
            <h3 className="text-[var(--text-primary)] font-semibold mb-4">
              {editingId
                ? t("Common.edit", "Edit Category")
                : t("Common.add", "New Category")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                  {t("Auth.name", "Name")}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-lg ${c} transition-all ${
                        form.color === c
                          ? "ring-2 ring-white scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={editingId ? handleSaveEdit : handleAdd}
                className="flex items-center gap-2 bg-[image:var(--gradient-brand)] text-[var(--text-primary)] px-5 py-2 rounded-xl text-sm"
              >
                <Save className="w-4 h-4" />
                {editingId
                  ? t("Common.save", "Save Changes")
                  : t("Common.add", "Add Category")}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:text-[var(--text-primary)] px-5 py-2 rounded-xl text-sm"
              >
                <XCircle className="w-4 h-4" />
                {t("Common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="glass rounded-2xl p-5 group hover:bg-white/[0.03] transition-all border border-transparent hover:border-[var(--border)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
                    title={t("Common.edit", "Edit")}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--error)]"
                    title={t("Common.delete", "Delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold mb-1">{cat.name}</h3>
              <p className="text-[var(--text-muted)] text-xs mb-3">/{cat.slug}</p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Briefcase className="w-3 h-3" />
                <span>
                  {cat.jobCount} {t("Companies.jobs", "jobs")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-10 h-10 text-[var(--text-subtle)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)] text-sm">
              {t("Common.noResults", "No categories found.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
