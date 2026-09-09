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
  CheckCircle2,
  AlertCircle,
  Wifi,
  ListChecks,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

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
  const { t } = useLocale();
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
        if (data.companies) setCompanies(data.companies);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
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
          requirements: form.requirements
            .split("\n")
            .filter((r) => r.trim()),
          responsibilities: form.responsibilities
            .split("\n")
            .filter((r) => r.trim()),
          benefits: form.benefits.split("\n").filter((b) => b.trim()),
          tags: form.tags
            .split(",")
            .map((x) => x.trim())
            .filter((x) => x),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("Common.error", "Failed to post job"));
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
      setError(t("Common.errorNetwork", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t("Common.loading", "Loading...")}</p>
        </div>
      </main>
    );
  }

  if (companies.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-md">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {t("Companies.noCompanies", "No Company Found")}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {t(
              "Employer.company",
              "You need to create a company profile before posting jobs."
            )}
          </p>
          <Link
            href="/employer/company/new"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Building2 className="w-4 h-4" />
            {t("Employer.company", "Create Company Profile")}
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
          <h2 className="text-xl font-bold text-white mb-2">
            {t("Common.success", "Job Posted!")}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {t(
              "Employer.postJob",
              "Your job is pending review and will be published after approval."
            )}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm"
            >
              {t("Employer.postJob", "Post another")}
            </button>
            <Link
              href="/employer/dashboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm"
            >
              {t("Employer.title", "Dashboard")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/employer/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back")}
        </Link>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <PlusSquare className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">
              {t("Employer.postJob", "Post a Job")}
            </h1>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                {t("Jobs.title", "Job title")} *
              </label>
              <input
                type="text"
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t("JobDetail.description", "Description")} *
              </label>
              <textarea
                name="description"
                required
                value={form.description}
                onChange={handleChange}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  {t("Jobs.location", "Location")}
                </label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t("Jobs.jobType", "Job Type")}
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                >
                  <option value="Full-time">
                    {t("Jobs.types.fullTime", "Full-time")}
                  </option>
                  <option value="Part-time">
                    {t("Jobs.types.partTime", "Part-time")}
                  </option>
                  <option value="Contract">
                    {t("Jobs.types.contract", "Contract")}
                  </option>
                  <option value="Freelance">
                    {t("Jobs.types.freelance", "Freelance")}
                  </option>
                  <option value="Internship">
                    {t("Jobs.types.internship", "Internship")}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t("Jobs.minSalary", "Min Salary")}
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  value={form.salaryMin}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t("Jobs.maxSalary", "Max Salary")}
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  value={form.salaryMax}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                  Currency
                </label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer w-fit">
              <input
                type="checkbox"
                name="remote"
                checked={form.remote}
                onChange={handleChange}
                className="w-4 h-4 rounded"
              />
              <Wifi className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">
                {t("Jobs.remoteOnly", "Remote")}
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <ListChecks className="w-3.5 h-3.5 inline mr-1" />
                {t("JobDetail.requirements", "Requirements")} (one per line)
              </label>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t("JobDetail.benefits", "Benefits")} (one per line)
              </label>
              <textarea
                name="benefits"
                value={form.benefits}
                onChange={handleChange}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {t("Jobs.tag", "Tags")}
              </label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder={t("Jobs.tagPlaceholder", "React, TypeScript")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Common.loading", "Submitting...")}
                </>
              ) : (
                <>
                  <PlusSquare className="w-4 h-4" />
                  {t("Employer.postJob", "Post Job")}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
