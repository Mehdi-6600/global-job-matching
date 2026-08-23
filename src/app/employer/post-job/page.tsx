"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Minus,
  DollarSign,
  MapPin,
  Clock,
  Tag,
  Layers,
  AlignLeft,
  CheckCircle2,
  ChevronRight,
  Globe,
} from "lucide-react";

type JobType = "full-time" | "part-time" | "contract" | "freelance" | "internship";
type Experience = "entry" | "mid" | "senior" | "lead" | "executive";

export default function PostJobPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    type: "full-time" as JobType,
    experience: "mid" as Experience,
    location: "",
    remote: false,
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    description: "",
    requirements: [""],
    responsibilities: [""],
    benefits: [""],
    tags: [] as string[],
    tagInput: "",
    deadline: "",
  });

  const addField = (field: "requirements" | "responsibilities" | "benefits") => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeField = (field: "requirements" | "responsibilities" | "benefits", idx: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  };

  const updateField = (
    field: "requirements" | "responsibilities" | "benefits",
    idx: number,
    val: string
  ) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[idx] = val;
      return { ...prev, [field]: arr };
    });
  };

  const addTag = () => {
    if (!form.tagInput.trim()) return;
    if (form.tags.includes(form.tagInput.trim())) return;
    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, prev.tagInput.trim()],
      tagInput: "",
    }));
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const canGoStep2 = form.title.trim().length > 2 && form.category !== "";
  const canGoStep3 = form.description.trim().length > 10;
  const canSubmit =
    canGoStep2 &&
    canGoStep3 &&
    form.requirements.some((r) => r.trim() !== "") &&
    form.responsibilities.some((r) => r.trim() !== "");

  const cleanArray = (arr: string[]) => arr.map((s) => s.trim()).filter((s) => s !== "");

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      ...form,
      requirements: cleanArray(form.requirements),
      responsibilities: cleanArray(form.responsibilities),
      benefits: cleanArray(form.benefits),
    };
    console.log("Submitting job:", payload);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="glass rounded-3xl p-10 max-w-md w-full text-center border border-emerald-500/20">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Job Posted!</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your job listing has been published successfully. You can manage it from your employer dashboard.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/employer/dashboard"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setForm({
                  title: "",
                  category: "",
                  type: "full-time",
                  experience: "mid",
                  location: "",
                  remote: false,
                  salaryMin: "",
                  salaryMax: "",
                  currency: "USD",
                  description: "",
                  requirements: [""],
                  responsibilities: [""],
                  benefits: [""],
                  tags: [],
                  tagInput: "",
                  deadline: "",
                });
              }}
              className="text-slate-400 text-sm hover:text-white transition-colors py-2"
            >
              Post Another Job
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Post a Job</h1>
          <p className="text-slate-400 text-sm">Create a new job listing in minutes</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    : "bg-white/5 text-slate-500 border border-white/10"
                }`}
              >
                {s}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  step >= s ? "text-white" : "text-slate-500"
                }`}
              >
                {s === 1 ? "Basic Info" : s === 2 ? "Details" : "Review"}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-white/10 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1.5">Job Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Developer"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  <option value="" className="bg-slate-800">Select category</option>
                  <option value="technology" className="bg-slate-800">Technology</option>
                  <option value="design" className="bg-slate-800">Design</option>
                  <option value="marketing" className="bg-slate-800">Marketing</option>
                  <option value="finance" className="bg-slate-800">Finance</option>
                  <option value="healthcare" className="bg-slate-800">Healthcare</option>
                  <option value="sales" className="bg-slate-800">Sales</option>
                  <option value="hr" className="bg-slate-800">HR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Job Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as JobType })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  <option value="full-time" className="bg-slate-800">Full-time</option>
                  <option value="part-time" className="bg-slate-800">Part-time</option>
                  <option value="contract" className="bg-slate-800">Contract</option>
                  <option value="freelance" className="bg-slate-800">Freelance</option>
                  <option value="internship" className="bg-slate-800">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Experience Level *</label>
                <select
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value as Experience })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                >
                  <option value="entry" className="bg-slate-800">Entry Level</option>
                  <option value="mid" className="bg-slate-800">Mid Level</option>
                  <option value="senior" className="bg-slate-800">Senior Level</option>
                  <option value="lead" className="bg-slate-800">Lead</option>
                  <option value="executive" className="bg-slate-800">Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. New York, USA"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, remote: !prev.remote }))}
                  className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                    form.remote
                      ? "bg-cyan-500 border-cyan-500"
                      : "bg-white/5 border-white/20"
                  }`}
                >
                  {form.remote && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-slate-300 text-sm">This is a remote position</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Job Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what a typical day looks like..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Salary Min</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      value={form.salaryMin}
                      onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                      placeholder="80000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Salary Max</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      value={form.salaryMax}
                      onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                      placeholder="120000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="USD" className="bg-slate-800">USD ($)</option>
                    <option value="EUR" className="bg-slate-800">EUR (€)</option>
                    <option value="GBP" className="bg-slate-800">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Application Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Requirements
                </label>
                <button
                  type="button"
                  onClick={() => addField("requirements")}
                  className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {form.requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateField("requirements", idx, e.target.value)}
                    placeholder={`Requirement ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                  />
                  {form.requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField("requirements", idx)}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Responsibilities */}
            <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Responsibilities
                </label>
                <button
                  type="button"
                  onClick={() => addField("responsibilities")}
                  className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {form.responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resp}
                    onChange={(e) => updateField("responsibilities", idx, e.target.value)}
                    placeholder={`Responsibility ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                  />
                  {form.responsibilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField("responsibilities", idx)}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Benefits
                </label>
                <button
                  type="button"
                  onClick={() => addField("benefits")}
                  className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {form.benefits.map((ben, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ben}
                    onChange={(e) => updateField("benefits", idx, e.target.value)}
                    placeholder={`Benefit ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                  />
                  {form.benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeField("benefits", idx)}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="glass rounded-2xl p-6 md:p-8 space-y-4">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Skills & Tags
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.tagInput}
                  onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="e.g. React, TypeScript... (press Enter)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-cyan-300 border border-cyan-500/20"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canGoStep3}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Review
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                Review Your Job Posting
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Title</span>
                  <span className="text-white text-sm font-medium">{form.title}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Category</span>
                  <span className="text-white text-sm font-medium capitalize">{form.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Type</span>
                  <span className="text-white text-sm font-medium capitalize">{form.type.replace("-", " ")}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Experience</span>
                  <span className="text-white text-sm font-medium capitalize">{form.experience}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Location</span>
                  <span className="text-white text-sm font-medium">
                    {form.remote ? "Remote" : form.location || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">Salary</span>
                  <span className="text-white text-sm font-medium">
                    {form.salaryMin && form.salaryMax
                      ? `${form.currency} ${form.salaryMin} - ${form.salaryMax}`
                      : "Not specified"}
                  </span>
                </div>
                <div className="py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm block mb-2">Description</span>
                  <p className="text-white text-sm leading-relaxed">{form.description}</p>
                </div>
                {form.tags.length > 0 && (
                  <div className="py-2 border-b border-white/5">
                    <span className="text-slate-400 text-sm block mb-2">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-md bg-white/5 text-cyan-300 border border-cyan-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Globe className="w-4 h-4" />
                Publish Job
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
