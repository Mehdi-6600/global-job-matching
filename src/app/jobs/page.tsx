"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  Search,
  Loader2,
} from "lucide-react";

type Job = {
  id: string;
  title: string;
  description: string;
  country: string;
  city: string;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  jobType: string;
  skillsRequired: string[];
  createdAt: string;
  employer: {
    name: string | null;
    profile: {
      companyName: string | null;
    } | null;
  };
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (data.jobs) setJobs(data.jobs);
      } catch (err) {
        console.error("Failed to load jobs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const filtered = jobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.city.toLowerCase().includes(search.toLowerCase()) ||
    job.country.toLowerCase().includes(search.toLowerCase()) ||
    job.skillsRequired.some((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    )
  );

  function formatSalary(job: Job) {
    if (!job.salaryMin && !job.salaryMax) return "Negotiable";
    const min = job.salaryMin
      ? `$${Number(job.salaryMin).toLocaleString()}`
      : "";
    const max = job.salaryMax
      ? `$${Number(job.salaryMax).toLocaleString()}`
      : "";
    if (min && max) return `${min} - ${max} ${job.salaryCurrency}/${job.salaryPeriod}`;
    return `${min || max} ${job.salaryCurrency}/${job.salaryPeriod}`;
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  function jobTypeLabel(type: string) {
    return type.replace("_", "-");
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Available Jobs
          </h1>
          <p className="text-[var(--text-muted)]">
            Find your next opportunity from top companies worldwide
          </p>
        </div>

        {/* Search */}
        <div className="glass-section p-2 mb-8 flex items-center gap-2">
          <Search className="w-5 h-5 text-[var(--text-muted)] ml-3" />
          <input
            type="text"
            placeholder="Search by title, city, or skill..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] py-2 px-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[var(--ios-blue)] animate-spin" />
          </div>
        )}

        {/* Jobs List */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            No jobs found matching your search.
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="glass-card block hover:border-[var(--ios-blue)]/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Company Avatar */}
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow shrink-0">
                  {(job.employer.profile?.companyName || job.employer.name || "C")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-[var(--text-primary)] text-lg">
                      {job.title}
                    </h3>
                    <span className="glass-pill text-[10px] uppercase">
                      {jobTypeLabel(job.jobType)}
                    </span>
                    {job.isRemote && (
                      <span className="glass-pill text-[10px] bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] border-[var(--ios-blue)]/20">
                        Remote
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {job.employer.profile?.companyName || job.employer.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.isRemote ? "Remote" : `${job.city}, ${job.country}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatSalary(job)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(job.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {job.skillsRequired.slice(0, 5).map((tag) => (
                      <span key={tag} className="glass-pill text-[10px]">
                        {tag}
                      </span>
                    ))}
                    {job.skillsRequired.length > 5 && (
                      <span className="glass-pill text-[10px]">
                        +{job.skillsRequired.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
