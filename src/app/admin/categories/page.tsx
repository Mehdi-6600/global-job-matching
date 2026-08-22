"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Search,
  Briefcase,
  Save,
  XCircle,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  jobCount: number;
  color: string;
}

const initialCategories: Category[] = [
  { id: "c1", name: "Technology", slug: "technology", jobCount: 156, color: "bg-cyan-500" },
  { id: "c2", name: "Design", slug: "design", jobCount: 48, color: "bg-purple-500" },
  { id: "c3", name: "Marketing", slug: "marketing", jobCount: 32, color: "bg-pink-500" },
  { id: "c4", name: "Finance", slug: "finance", jobCount: 24, color: "bg-emerald-500" },
  { id: "c5", name: "Healthcare", slug: "healthcare", jobCount: 18, color: "bg-red-500" },
  { id: "c6", name: "Education", slug: "education", jobCount: 12, color: "bg-amber-500" },
  { id: "c7", name: "Sales", slug: "sales", jobCount: 28, color: "bg-blue-500" },
  { id: "c8", name: "HR", slug: "hr", jobCount: 9, color: "bg-teal-500" },
];

const colorOptions = [
  "bg-cyan-500", "bg-blue-500", "bg-purple-500", "bg-pink-500",
  "bg-emerald-500", "bg-teal-500", "bg-amber-500", "bg-red-500",
  "bg-orange-500", "bg-indigo-500",
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", color: "bg-cyan-500" });

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
    setForm({ name: "", slug: "", color: "bg-cyan-500" });
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
          ? { ...c, name: form.name.trim(), slug: form.slug.trim(), color: form.color }
          : c
      )
    );
    setEditingId(null);
    setForm({ name: "", slug: "", color: "bg-cyan-500" });
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ name: "", slug: "", color: "bg-cyan-500" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Categories</h1>
            <p className="text-slate-400 text-sm">Manage job categories and tags</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="glass rounded-2xl p-5 md:p-6 mb-6 border border-cyan-500/20">
            <h3 className="text-white font-semibold mb-4">
              {editingId ? "Edit Category" : "New Category"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Technology"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. technology"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-lg ${c} transition-all ${
                        form.color === c ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={editingId ? handleSaveEdit : handleAdd}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <Save className="w-4 h-4" />
                {editingId ? "Save Changes" : "Add Category"}
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-sm transition-all"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="glass rounded-2xl p-5 group hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-semibold mb-1">{cat.name}</h3>
              <p className="text-slate-400 text-xs mb-3">/{cat.slug}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Briefcase className="w-3 h-3" />
                <span>{cat.jobCount} jobs</span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No categories found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
