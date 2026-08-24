"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Globe,
  Users,
  Briefcase,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Mail,
} from "lucide-react";

interface Company {
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

interface CompanyJob {
  id: string;
  title: string;
  location: string;
  type: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  remote: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "Today";
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
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/companies/${companyId}`).then((r) => r.json()),
      fetch(`/api/jobs?company=${companyId}`).then((r) => r.json()),
    ])
      .then(([companyData, jobsData]) => {
        if (companyData.company) {
          setCompany(companyData.company);
        } else {
          setError("Company not found");
        }
        if (jobsData.jobs) {
          setJobs(jobsData.jobs);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load company");
        setLoading(false);
      });
  }, [companyId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading company...</p>
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Company not found"}</p>
          <Link href="/companies" className="text-cyan-400 text-sm hover:underline">
            Back to Companies
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to companies
        </Link>

        {/* Company Header */}
        <div className="glass rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 font-bold text-2xl">{getLogo(company.name)}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{company.name}</h1>
              {company.description && (
                <p className="text-slate-300 text-sm leading-relaxed mb-4">{company.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                {company.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {company.location}
                  </span>
                )}
                {company.size && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {company.size}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-cyan-400 hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {company.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-cyan-400" />
              Open Positions
            </h2>
            <span className="text-slate-400 text-sm">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No open positions at the moment</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-5 hover:bg-white/5 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-white font-medium mb-1">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                          {job.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 capitalize">
                          {job.experience}
                        </span>
                        {job.remote && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            Remote
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                      <span>
                        {job.currency}
                        {(job.salaryMin ?? 0).toLocaleString()} - {(job.salaryMax ?? 0).toLocaleString()}
                      </span>
                      <span>{timeAgo(job.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
