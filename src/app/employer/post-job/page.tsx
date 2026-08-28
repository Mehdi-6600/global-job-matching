"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusSquare,
  ArrowLeft,
  Loader2,
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Wifi,
  Tag,
  ListChecks,
  Sparkles,
} from "lucide-react";

const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const experiences = ["Entry", "Mid", "Senior", "Lead", "Executive"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

interface Company {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  logo: string | null;
  status: string;
}

export default function PostJobPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    remote: false,
    type: "Full-time",
    experience: "Mid",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    requirements: "",
    responsibilities: "",
    benefits: "",
    tags: "",
    deadline: "",
  });

  useEffect(() => {
    fetch("/api/employer/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          setCompanies(data.companies);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
          requirements: form.requirements.split("\n").filter((r) => r.trim()),
          responsibilities: form.responsibilities.split("\n").filter((r) => r.trim()),
          benefits: form.benefits.split("\n").filter((b) => b.trim()),
          tags: form.tags.split(",").map((t) => t.trim()).filter((t) => t),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post job");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setForm({
        title: "",
        description: "",
        location: "",
        remote: false,
        type: "Full-time",
        experience: "Mid",
        salaryMin: "",
        salaryMax: "",
        currency: "USD",
        requirements: "",
        responsibilities: "",
        benefits: "",
        tags: "",
        deadline: "",
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (companies.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-md">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Found</h2>
          <p className="text-slate-400 text-sm mb-6">
            You need to create a company profile before posting jobs.
          </p>
          <Link
            href="/employer/company/new"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Building2 className="w-4 h-4" />
            Create Company Profile
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Job Posted!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your job is pending review and will be published after approval.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Post Another
            </button>
            <Link
              href="/jobs"
              className="bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              View Jobs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
              <PlusSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Post a New Job</h1>
              <p className="text-slate-400 text-sm">Fill in the details below</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Developer"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Posting as
              </label>
              <p className="text-white text-sm font-medium">{companies[0].name}</p>
              {companies[0].location && (
                <p className="text-slate-400 text-xs mt-0.5">{companies[0].location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Description *
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the role, team, and what you are looking for..."
                rows={5}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Berlin, Germany"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-white/5 border border-white/10 w-full">
                  <input
                    type="checkbox"
                    name="remote"
                    checked={form.remote}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 accent-cyan-500"
                  />
                  <span className="text-slate-300 text-sm flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    Remote Allowed
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                  Job Type *
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all appearance-none"
                >
                  {jobTypes.map((t) => (
                    <option key={t} value={t} className="bg-slate-800">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  Experience *
                </label>
                <select
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all appearance-none"
                >
                  {experiences.map((e) => (
                    <option key={e} value={e} className="bg-slate-800">
                      {e} Level
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                  Min Salary
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  value={form.salaryMin}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Max Salary
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  value={form.salaryMax}
                  onChange={handleChange}
                  placeholder="80000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all appearance-none"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c} className="bg-slate-800">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <ListChecks className="w-3.5 h-3.5 inline mr-1" />
                Requirements (one per line)
              </label>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                placeholder="3+ years of React experience&#10;TypeScript proficiency&#10;English fluency"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Responsibilities (one per line)
              </label>
              <textarea
                name="responsibilities"
                value={form.responsibilities}
                onChange={handleChange}
                placeholder="Build and maintain frontend features&#10;Collaborate with design team&#10;Code reviews"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Benefits (one per line)
              </label>
              <textarea
                name="benefits"
                value={form.benefits}
                onChange={handleChange}
                placeholder="Flexible working hours&#10;Health insurance&#10;Remote work options"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Tag className="w-3.5 h-3.5 inline mr-1" />
                Tags (comma separated)
              </label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="React, TypeScript, Remote, Frontend"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Application Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <PlusSquare className="w-4 h-4" />
                  Post Job
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
