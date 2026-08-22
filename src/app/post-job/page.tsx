"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Send,
  Check,
  FileText,
  ListChecks,
  Sparkles,
} from "lucide-react";

export default function PostJobPage() {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    salary: "",
    description: "",
    companyDescription: "",
    isRemote: false,
  });

  const [requirements, setRequirements] = useState<string[]>([""]);
  const [benefits, setBenefits] = useState<string[]>([""]);
  const [tags, setTags] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addRequirement = () => setRequirements([...requirements, ""]);
  const updateRequirement = (idx: number, value: string) => {
    const next = [...requirements];
    next[idx] = value;
    setRequirements(next);
  };
  const removeRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  const addBenefit = () => setBenefits([...benefits, ""]);
  const updateBenefit = (idx: number, value: string) => {
    const next = [...benefits];
    next[idx] = value;
    setBenefits(next);
  };
  const removeBenefit = (idx: number) => {
    setBenefits(benefits.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ ...form, requirements, benefits, tags: tags.split(",").map((t) => t.trim()) });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Post a New Job</h1>
          <p className="text-slate-400 text-sm">Fill in the details below to publish your job listing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Info */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Job Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Job Title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={(e) => handleChange("company", e.target.value)}
                      placeholder="e.g. TechCorp"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Location *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Job Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all appearance-none"
                  >
                    <option value="Full-time" className="bg-slate-800">Full-time</option>
                    <option value="Part-time" className="bg-slate-800">Part-time</option>
                    <option value="Contract" className="bg-slate-800">Contract</option>
                    <option value="Freelance" className="bg-slate-800">Freelance</option>
                    <option value="Internship" className="bg-slate-800">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Salary Range</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.salary}
                      onChange={(e) => handleChange("salary", e.target.value)}
                      placeholder="e.g. $120k - $160k"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(e) => handleChange("isRemote", e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                />
                <span className="text-sm text-slate-300">This is a remote position</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Description
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Description</label>
                <textarea
                  value={form.companyDescription}
                  onChange={(e) => handleChange("companyDescription", e.target.value)}
                  rows={3}
                  placeholder="Tell candidates about your company..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Job Description *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-cyan-400" />
              Requirements
            </h2>
            <div className="space-y-3">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateRequirement(idx, e.target.value)}
                    placeholder={`Requirement ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                  />
                  {requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      className="px-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRequirement}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Requirement
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Benefits
            </h2>
            <div className="space-y-3">
              {benefits.map((ben, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={ben}
                    onChange={(e) => updateBenefit(idx, e.target.value)}
                    placeholder={`Benefit ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
                  />
                  {benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBenefit(idx)}
                      className="px-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addBenefit}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Benefit
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Tags
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Skills / Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-slate-500">* Required fields</p>
            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20"
            >
              {submitted ? (
                <>
                  <Check className="w-4 h-4" />
                  Published!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
