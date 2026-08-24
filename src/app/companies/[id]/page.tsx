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
  Loader2,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Clock,
  DollarSign,
  Wifi,
} from "lucide-react";

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

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Invalid company ID");
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
          setError(companyData.error || "Company not found");
        }
        if (jobsData.jobs) {
          setJobs(jobsData.jobs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load company");
        setLoading(false);
      });
  }, [id]);

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
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium mb-4">{error || "Not found"}</p>
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            All Companies
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Companies
        </Link>

        {/* Company Header */}
        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <span className="text-cyan-400 font-bold text-2xl">
                {getLogo(company.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {company.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-4">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.location}
                  </span>
                )}
                {company.size && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {company.size}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {jobs.length} active job{jobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {company.description && (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
                  {company.description}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" />
            Open Positions
          </h2>

          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="glass rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <h3 className="text-white font-semibold text-sm mb-3 group-hover:text-cyan-300 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {job.currency} {(job.salaryMin ?? 0).toLocaleString()} - {(job.salaryMax ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.type}
                    </span>
                    {job.remote && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Wifi className="w-3 h-3" />
                        Remote
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags
                      .filter((t) => !t.startsWith("http"))
                      .slice(0, 4)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No open positions right now.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
