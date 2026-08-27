"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Loader2,
  ArrowLeft,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";

interface MyJob {
  id: string;
  title: string;
  location: string;
  type: string;
  remote: boolean;
  status: string;
  createdAt: string;
  company: { id: string; name: string } | null;
  applicantCount: number;
}

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    type: "full-time",
    remote: false,
    experience: "",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    companyName: "",
    tags: "",
  });

  const loadJobs = () => {
    setLoading(true);
    fetch("/api/employer/jobs")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login?callbackUrl=/dashboard/employer";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.jobs) setJobs(data.jobs);
        else if (data.error) setError(data.error);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load jobs");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPosting(true);

    try {
      const res = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          location: form.location,
          type: form.type,
          remote: form.remote,
          experience: form.experience || null,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          currency: form.currency,
          companyName: form.companyName || undefined,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post job");
        setPosting(false);
        return;
      }

      setSuccess("Job posted successfully!");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        location: "",
        type: "full-time",
        remote: false,
        experience: "",
        salaryMin: "",
        salaryMax: "",
        currency: "USD",
        companyName: "",
        tags: "",
      });
      loadJobs();
    } catch {
      setError("Network error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Employer Panel</h1>
              <p className="text-slate-400 text-sm">
                Your jobs · {jobs.length} posted
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "Post a Job"}
          </button>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 border border-white/10 mb-8 space-y-4"
          >
            <h2 className="text-lg font-semibold text-white mb-2">New Job</h2>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Job title *"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50"
            />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Job description (min 20 characters) *"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="Location *"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Company name (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              <input
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder="Experience"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <label className="flex items-center gap-2 text-slate-300 text-sm px-2">
                <input
                  type="checkbox"
                  name="remote"
                  checked={form.remote}
                  onChange={handleChange}
                />
                Remote
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                name="salaryMin"
                type="number"
                value={form.salaryMin}
                onChange={handleChange}
                placeholder="Min salary"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <input
                name="salaryMax"
                type="number"
                value={form.salaryMax}
                onChange={handleChange}
                placeholder="Max salary"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="Tags (React, Node)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
            <button
              type="submit"
              disabled={posting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {posting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Publish Job
                </>
              )}
            </button>
          </form>
        )}

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-white font-semibold">Your posted jobs</h2>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              No jobs yet. Post your first one!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-white font-medium text-sm hover:text-emerald-300"
                    >
                      {job.title}
                    </Link>
                    <p className="text-slate-400 text-xs flex flex-wrap items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {job.company?.name || "Company"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span>{job.type}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/employer/applicants/${job.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {job.applicantCount ?? 0} applicants
                    </Link>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
