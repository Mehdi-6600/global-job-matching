"use client";

import { useState } from "react";
import {
  Heart,
  MapPin,
  Briefcase,
  DollarSign,
  ArrowRight,
  BookmarkX,
  Search,
} from "lucide-react";
import Link from "next/link";

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
  tags: string[];
  isRemote: boolean;
}

const initialSaved: SavedJob[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Global",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$120k - $160k",
    postedAt: "2 days ago",
    tags: ["React", "Next.js", "TypeScript"],
    isRemote: true,
  },
  {
    id: "3",
    title: "Product Designer",
    company: "Creative Studio",
    location: "London, UK",
    type: "Full-time",
    salary: "£70k - £90k",
    postedAt: "5 days ago",
    tags: ["Figma", "UI/UX", "Design Systems"],
    isRemote: true,
  },
  {
    id: "5",
    title: "DevOps Engineer",
    company: "CloudScale Inc",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$140k - $180k",
    postedAt: "1 week ago",
    tags: ["AWS", "Terraform", "K8s"],
    isRemote: true,
  },
];

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(initialSaved);

  const removeJob = (id: string) => {
    setSavedJobs((prev) => prev.filter((job) => job.id !== id));
  };

  if (savedJobs.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
            <BookmarkX className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Saved Jobs</h2>
          <p className="text-slate-400 text-sm mb-6">
            You haven't saved any jobs yet. Browse jobs and click the heart icon to save them here.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20"
          >
            <Search className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Saved Jobs</h1>
            <p className="text-slate-400 text-sm">
              {savedJobs.length} job{savedJobs.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link
            href="/jobs"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
          >
            Browse more
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              className="glass rounded-2xl p-5 md:p-6 relative overflow-hidden group hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <Link href={`/jobs/${job.id}`}>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors mb-1">
                        {job.title}
                      </h3>
                    </Link>
                    <p className="text-slate-400 text-sm mb-3">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary}
                      </span>
                      <span className="text-slate-500">{job.postedAt}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-end">
                  <button
                    onClick={() => removeJob(job.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-sm"
                  >
                    <BookmarkX className="w-4 h-4" />
                    Remove
                  </button>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
