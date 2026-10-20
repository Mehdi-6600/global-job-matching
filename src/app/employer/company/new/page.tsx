"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Globe,
  FileText,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function NewCompanyPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    website: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError(
        t("Common.error", "Company name must be at least 2 characters.")
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          location: form.location.trim() || undefined,
          website: form.website.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || t("Common.error", "Failed to create company profile.")
        );
        setSubmitting(false);
        return;
      }

      router.push("/employer/post-job");
    } catch {
      setError(t("Common.errorNetwork", "Network error. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <div className="gjm-page px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/employer/dashboard"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to Dashboard")}
        </Link>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary-soft)] border border-[var(--border)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {t("Employer.company", "Create Company")}
              </h1>
              <p className="text-[var(--text-muted)] text-sm">
                {t(
                  "Employer.title",
                  "Add your company profile before posting jobs"
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-body)] mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline me-1" />
                {t("Employer.company", "Company name")} *
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Acme Inc."
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-subtle)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-body)] mb-1.5">
                <FileText className="w-3.5 h-3.5 inline me-1" />
                {t("JobDetail.description", "Description")}
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t(
                  "JobDetail.description",
                  "What does your company do?"
                )}
                rows={4}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-subtle)] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-body)] mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline me-1" />
                {t("Jobs.location", "Location")}
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder={t(
                  "Jobs.locationPlaceholder",
                  "e.g. Berlin, Germany"
                )}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-subtle)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-body)] mb-1.5">
                <Globe className="w-3.5 h-3.5 inline me-1" />
                {t("Companies.website", "Website")}
              </label>
              <input
                type="url"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-subtle)]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[image:var(--gradient-brand)] text-[var(--text-primary)] py-3 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Common.loading", "Creating...")}
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  {t("Employer.company", "Create Company")}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
