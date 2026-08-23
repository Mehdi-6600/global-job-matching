"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  ArrowRight,
  Loader2,
  Trash2,
  Briefcase,
} from "lucide-react";

interface SavedJob {
  id: string;
  createdAt: string;
  job: {
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
    company: {
      id: string;
      name: string;
      logo: string | null;
      location: string | null;
    };
  };
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

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saved-jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.savedJobs) {
          setSavedJobs(data.savedJobs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRemove = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      await fetch(`/api/saved-jobs?jobId=${jobId}`, { method: "DELETE" });
      setSavedJobs((prev) => prev.filter((sj) => sj.job.id !== jobId));
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading saved jobs...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Saved Jobs</h1>
          <p className="text-slate-400 text-sm">
            {savedJobs.length} job{savedJobs.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {savedJobs.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Heart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">No saved jobs yet</p>
            <p className="text-slate-400 text-sm mb-6">
              Save jobs you like and come back to them later.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
            >
              Browse Jobs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedJobs.map((saved) => {
              const job = saved.job;
              const displayTags = job.tags.filter((t) => !t.startsWith("http")).slice(0, 5);
              return (
                <div
                  key={saved.id}
                  className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                        <span className="text-cyan-400 font-bold text-xs">
                          {getLogo(job.company.name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">{job.title}</h3>
                        <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {job.company.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(job.id)}
                      disabled={removingId === job.id}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      {removingId === job.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {job.currency}
                      {(job.salaryMin ?? 0).toLocaleString()} - {(job.salaryMax ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.type}
                    </span>
                    {job.remote && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                        Remote
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {displayTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5 break-all max-w-[120px] truncate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Saved {timeAgo(saved.createdAt)}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
                    >
                      View Job
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
