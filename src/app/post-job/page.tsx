"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  ArrowLeft,
  Wifi,
} from "lucide-react";

const jobTypes = ["full-time", "part-time", "contract", "freelance", "internship"];
const experiences = ["entry", "mid", "senior", "lead", "executive"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

export default function PostJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    companyName: "",
    description: "",
    location: "",
    remote: false,
    type: "full-time",
    experience: "mid",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    requirements: [""],
    responsibilities: [""],
    benefits: [""],
    tags: [""],
  });

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: string, index: number, value: string) => {
    setForm((prev) => {
      const arr = [...(prev as any)[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayField = (field: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...(prev as any)[field], ""],
    }));
  };

  const removeArrayField = (field: string, index: number) => {
    setForm((prev) => {
      const arr = [...(prev as any)[field]];
      arr.splice(index, 1);
      if (arr.length === 0) arr.push("");
      return { ...prev, [field]: arr };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      requirements: form.requirements.filter(Boolean),
      responsibilities: form.responsibilities.filter(Boolean),
      benefits: form.benefits.filter(Boolean),
      tags: form.tags.filter(Boolean),
    };

    try {
      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/jobs"), 2000);
      } else {
        alert(data.error || "Failed to post job");
      }
    } catch (err) {
      alert("Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Job Posted!</h2>
          <p className="text-slate-400 text-sm mb-4">Your job listing is now live.</p>
          <Link href="/jobs" className="text-cyan-400 text-sm hover:underline">
            View all jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        <div className="glass rounded-3xl p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Post a Job</h1>
          <p className="text-slate-400 text-sm mb-8">Reach thousands of qualified candidates</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Senior React Developer"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="e.g. TechCorp"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Location & Remote */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="e.g. Berlin, Germany"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => updateField("remote", !form.remote)}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all border ${
                    form.remote
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  {form.remote ? "Remote OK" : "Not Remote"}
                </button>
              </div>
            </div>

            {/* Type & Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Job Type</label>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {jobTypes.map((t) => (
                    <option key={t} value={t} className="bg-slate-800">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Experience</label>
                <select
                  value={form.experience}
                  onChange={(e) => updateField("experience", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {experiences.map((e) => (
                    <option key={e} value={e} className="bg-slate-800">
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Min Salary</label>
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => updateField("salaryMin", e.target.value)}
                  placeholder="80000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Max Salary</label>
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => updateField("salaryMax", e.target.value)}
                  placeholder="120000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c} className="bg-slate-800">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Dynamic Fields */}
            {[
              { field: "requirements", label: "Requirements", placeholder: "e.g. 3+ years React experience" },
              { field: "responsibilities", label: "Responsibilities", placeholder: "e.g. Build frontend features" },
              { field: "benefits", label: "Benefits", placeholder: "e.g. Remote work, Health insurance" },
              { field: "tags", label: "Tags / Skills", placeholder: "e.g. React, TypeScript" },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                <div className="space-y-2">
                  {(form as any)[field].map((item: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateArrayField(field, idx, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                      />
                      {(form as any)[field].length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField(field, idx)}
                          className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField(field)}
                    className="flex items-center gap-1.5 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add {label}
                  </button>
                </div>
              </div>
            ))}

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Briefcase className="w-4 h-4" />
                    Post Job
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
