"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  Share2,
  Send,
  CheckCircle2,
  Globe,
  Users,
  Calendar,
  ChevronLeft,
  Layers,
  AlignLeft,
  Award,
  Loader2,
  Loader,
} from "lucide-react";

interface ApiJob {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  deadline: string | null;
  viewCount: number;
  applicantCount: number;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
    website: string | null;
    size: string | null;
    description: string | null;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

function getLogo(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return "Not disclosed";
  const c = currency || "$";
  if (min && max) return `${c}${(min / 1000).toFixed(0)}k - ${c}${(max / 1000).toFixed(0)}k / year`;
  if (min) return `${c}${(min / 1000).toFixed(0)}k+ / year`;
  return `Up to ${c}${(max! / 1000).toFixed(0)}k / year`;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<ApiJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) {
          const found = data.jobs.find((j: ApiJob) => j.id === jobId);
          if (found) {
            setJob(found);
          } else {
            setError("Job not found");
          }
        } else {
          setError("Failed to load job");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load job");
        setLoading(false);
      });
  }, [jobId]);

  useEffect(() => {
    // Check if job is saved
    fetch("/api/saved-jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.savedJobs) {
          const isSaved = data.savedJobs.some((sj: any) => sj.jobId === jobId);
          setSaved(isSaved);
        }
      })
      .catch(() => {});
  }, [jobId]);

  useEffect(() => {
    // Check if already applied
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          const isApplied = data.applications.some((app: any) => app.jobId === jobId);
          setApplied(isApplied);
        }
      })
      .catch(() => {});
  }, [jobId]);

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      if (saved) {
        await fetch(`/api/saved-jobs?jobId=${jobId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/saved-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApply = async () => {
    setApplyLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, coverLetter }),
      });
      const data = await res.json();
      if (data.success) {
        setApplied(true);
        setShowApplyForm(false);
      } else {
        alert(data.error || "Failed to apply");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to apply");
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading job details...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Job not found"}</p>
          <Link
            href="/jobs"
            className="bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm"
          >
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  const salaryText = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const postedText = timeAgo(job.createdAt);
  const displayTags = job.tags.filter((t) => !t.startsWith("http")).slice(0, 8);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to jobs
        </Link>

        {/* Header Card */}
        <div className="glass rounded-3xl p-6 md:p-8 mb-6 border border-white/5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <span className="text-cyan-400 font-bold text-xl">{getLogo(job.company.name)}</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    {job.company.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {job.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {displayTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-cyan-300 border border-cyan-500/10 break-all max-w-[120px] truncate"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  saved
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
              >
                {saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
                )}
                {saved ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: job.title, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Salary</p>
                <p className="text-white text-sm font-medium">{salaryText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Experience</p>
                <p className="text-white text-sm font-medium capitalize">{job.experience}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Posted</p>
                <p className="text-white text-sm font-medium">{postedText}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Applicants</p>
                <p className="text-white text-sm font-medium">{job.applicantCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-cyan-400" />
                Description
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  Responsibilities
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="glass rounded-2xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Benefits
                </h2>
                <ul className="space-y-3">
                  {job.benefits.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="glass rounded-2xl p-6 sticky top-24">
              {!applied ? (
                <>
                  {!showApplyForm ? (
                    <>
                      <button
                        onClick={() => setShowApplyForm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-sm font-medium transition-all mb-3"
                      >
                        <Send className="w-4 h-4" />
                        Apply Now
                      </button>
                      <p className="text-center text-xs text-slate-500">
                        Easy application with your profile
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Optional cover letter..."
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowApplyForm(false)}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApply}
                          disabled={applyLoading}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        >
                          {applyLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-white font-medium text-sm mb-1">Application Sent!</p>
                  <p className="text-slate-400 text-xs">Good luck with your application.</p>
                </div>
              )}

              <div className="h-px bg-white/5 my-5" />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Posted</span>
                  <span className="text-white">{postedText}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Job ID</span>
                  <span className="text-white font-mono text-xs">{job.id.slice(0, 8)}</span>
                </div>
                {job.remote && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Work Mode</span>
                    <span className="text-emerald-400">Remote OK</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Card */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-white font-semibold text-sm mb-4">About {job.company.name}</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-sm">{getLogo(job.company.name)}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{job.company.name}</p>
                  <p className="text-slate-500 text-xs">{job.company.size || "Company"}</p>
                </div>
              </div>
              {job.company.description && (
                <p className="text-slate-400 text-xs mb-4 line-clamp-3">{job.company.description}</p>
              )}
              <div className="space-y-2 mb-4">
                {job.company.website && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Globe className="w-3.5 h-3.5" />
                    {job.company.website}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.company.location || job.location}
                </div>
              </div>
              <Link
                href={`/companies/${job.company.id}`}
                className="block text-center text-cyan-400 text-xs hover:underline"
              >
                View Company Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
