"use client";

import { useState } from "react";
import {
  Bookmark,
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Trash2,
  ExternalLink,
  BookmarkX,
} from "lucide-react";

interface SavedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  postedAt: string;
  tags: string[];
  logo: string;
}

const initialJobs: SavedJob[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    salary: "$120k - $150k",
    type: "Full-time",
    postedAt: "2 days ago",
    tags: ["React", "TypeScript", "Next.js"],
    logo: "TC",
  },
  {
    id: "2",
    title: "Backend Engineer",
    company: "CloudScale",
    location: "London, UK",
    salary: "£80k - £100k",
    type: "Full-time",
    postedAt: "5 days ago",
    tags: ["Node.js", "PostgreSQL", "AWS"],
    logo: "CS",
  },
  {
    id: "3",
    title: "Product Designer",
    company: "Creative Studio",
    location: "Paris, France",
    salary: "€60k - €80k",
    type: "Contract",
    postedAt: "1 week ago",
    tags: ["Figma", "UI/UX", "Design Systems"],
    logo: "CR",
  },
  {
    id: "4",
    title: "DevOps Engineer",
    company: "DataFlow",
    location: "Berlin, Germany",
    salary: "€90k - €110k",
    type: "Full-time",
    postedAt: "3 days ago",
    tags: ["Docker", "Kubernetes", "CI/CD"],
    logo: "DF",
  },
  {
    id: "5",
    title: "Mobile Developer",
    company: "NextGen Labs",
    location: "Toronto, Canada",
    salary: "$100k - $130k",
    type: "Full-time",
    postedAt: "4 days ago",
    tags: ["React Native", "iOS", "Android"],
    logo: "NG",
  },
];

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJob[]>(initialJobs);
  const [search, setSearch] = useState("");

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Saved Jobs</h1>
            <p className="text-slate-400 text-sm">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved jobs by title, company, or tag..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Jobs Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="glass rounded-2xl p-5 border border-transparent hover:border-white/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold text-xs">{job.logo}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{job.title}</h3>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {job.company}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeJob(job.id)}
                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Remove from saved"
                  >
                    <BookmarkX className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {job.salary}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.postedAt}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/jobs/${job.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View & Apply
                  </a>
                  <button
                    onClick={() => removeJob(job.id)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 px-4 py-2 rounded-xl text-xs transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">No saved jobs</p>
            <p className="text-slate-500 text-sm">Browse jobs and save the ones you like.</p>
          </div>
        )}
      </div>
    </main>
  );
}
