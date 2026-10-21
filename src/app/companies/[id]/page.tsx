"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Globe,
  Briefcase,
  Loader2,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Wifi,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  website: string | null;
  location: string | null;
  size: string | null;
  description: string | null;
  logo: string | null;
  status: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  createdAt: string;
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CompanyDetailPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError(t("Common.error", "Invalid company ID"));
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/companies/${id}`).then((r) => r.json()),
      fetch(`/api/jobs?company=${id}`).then((r) => r.json()),
    ])
      .then(([companyData, jobsData]) => {
        if (companyData.company) {
          setCompany(companyData.company);
        } else {
          setError(
            companyData.error ||
              t("Companies.noCompanies", "Company not found")
          );
        }
        if (jobsData.jobs) {
          setJobs(jobsData.jobs);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t("Common.error", "Failed to load company"));
        setLoading(false);
      });
  }, [id, t]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {t("Common.loading", "Loading...")}
          </p>
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 border border-white/10 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-4">
            {error || t("Companies.noCompanies", "Company not found")}
          </p>
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 text-cyan-400 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Companies.title", "Companies")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back")}
        </Link>

        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-cyan-300 font-bold text-lg shrink-0">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo}
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                getLogo(company.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {company.name}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.location}
                  </span>
                )}
                {company.website && (
                  <a
                    href={
                      company.website.startsWith("http")
                        ? company.website
                        : `https://${company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {t("Companies.website", "Website")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
          {company.description && (
            <p className="mt-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {company.description}
            </p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-cyan-400" />
          {t("Companies.jobs", "Jobs")} ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-white/10">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {t("Jobs.noJobsFound", "No open positions right now.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block glass rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-white font-medium text-sm">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      {job.remote && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Wifi className="w-3 h-3" />
                          {t("Common.remote", "Remote")}
                        </span>
                      )}
                      {(job.salaryMin || job.salaryMax) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.currency}{" "}
                          {(job.salaryMin ?? 0).toLocaleString(locale)}
                          {" - "}
                          {(job.salaryMax ?? 0).toLocaleString(locale)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-cyan-400 text-xs font-medium">
                    {t("Common.view", "View")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
