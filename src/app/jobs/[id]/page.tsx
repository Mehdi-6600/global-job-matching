"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Building2,
  Heart,
  Globe,
  Calendar,
  Users,
  CheckCircle2,
  Loader2,
  X,
  Send,
  Wifi,
  AlertCircle,
} from "lucide-react";
import ShareButtons from "../../components/ShareButtons";
import { ContactEmployer } from "@/components/contact-employer";

interface JobDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  type: string;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  tags: string[];
  status: string;
  deadline: string | null;
  viewCount: number;
  applicantCount: number;
  createdAt: string;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
    description: string | null;
    website: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  } | null;
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

function getLogo(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatSalary(
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
) {
  const cur = currency || "USD";
  if (min == null && max == null) return "Salary not specified";
  if (min != null && max != null) {
    return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `From ${cur} ${min.toLocaleString()}`;
  return `Up to ${cur} ${max!.toLocaleString()}`;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setError("Invalid job ID");
      setLoading(false);
      return;
    }

    fetch(`/api/jobs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.job) {
          setJob({
            ...data.job,
            requirements: data.job.requirements || [],
            responsibilities: data.job.responsibilities || [],
            benefits: data.job.benefits || [],
            tags: data.job.tags || [],
            applicantCount: data.job.applicantCount ?? 0,
            viewCount: data.job.viewCount ?? 0,
          });
        } else {
          setError(data.error || "Job not found");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load job details");
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/saved-jobs", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/jobs/${id}`);
        return;
      }
      if (res.ok) setSaved(!saved);
    } catch {
      // silent
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");
    setApplying(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, coverLetter }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/jobs/${id}`);
          return;
        }
        if (res.status === 409) {
          setApplyError("You have already applied for this job.");
          return;
        }
        setApplyError(data.error || "Failed to submit application");
        return;
      }

      setApplySuccess(true);
      setCoverLetter("");
      if (job) {
        setJob({ ...job, applicantCount: (job.applicantCount || 0) + 1 });
      }
    } catch {
      setApplyError("Network error. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading job details...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-8 border border-white/10 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium mb-4">
            {error || "Job not found"}
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  const companyName = job.company?.name || "Company";
  const companyId = job.company?.id;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all jobs
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <span className="text-cyan-400 font-bold text-sm">
                      {getLogo(companyName)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {companyName}
                      </span>
                      {job.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                          {job.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`p-2.5 rounded-xl transition-all border ${
                      saved
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-red-400"
                    }`}
                    aria-label="Save job"
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={saved ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
                {job.type && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {job.type}
                  </span>
                )}
                {job.experience && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {job.experience}
                  </span>
                )}
                {job.remote && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
                    <Wifi className="w-3.5 h-3.5" />
                    Remote
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  {formatSalary(job.currency, job.salaryMin, job.salaryMax)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setApplyOpen(true);
                    setApplySuccess(false);
                    setApplyError("");
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  Apply Now
                </button>
                {shareUrl && (
                  <ShareButtons
                    title={`${job.title} at ${companyName}`}
                    url={shareUrl}
                  />
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                About the Role
              </h2>
              <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {job.requirements.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-300 text-sm sm:text-base"
                    >
                      <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-purple-400 text-xs font-bold">
                          {i + 1}
                        </span>
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.responsibilities.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Responsibilities
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((resp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-300 text-sm sm:text-base"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </span>
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.benefits.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  Benefits
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {job.benefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                      <span className="text-slate-300 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.tags.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4">
                  Skills & Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.tags
                    .filter((tag) => !tag.startsWith("http"))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs sm:text-sm border border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <ContactEmployer jobId={job.id} jobTitle={job.title} />
          </div>

          <div className="lg:w-80 shrink-0 space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/10 sticky top-24">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                About Company
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-sm">
                    {getLogo(companyName)}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{companyName}</p>
                  {job.company?.location && (
                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {job.company.location}
                    </p>
                  )}
                </div>
              </div>
              {job.company?.description && (
                <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-4">
                  {job.company.description}
                </p>
              )}
              {job.company?.website && (
                <a
                  href={job.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm transition-colors mb-4"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                </a>
              )}
              {companyId && (
                <Link
                  href={`/jobs?company=${companyId}`}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  More jobs at {companyName}
                </Link>
              )}
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4 text-sm">
                Job Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Posted
                  </span>
                  <span className="text-slate-300">
                    {timeAgo(job.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Applicants
                  </span>
                  <span className="text-slate-300">
                    {job.applicantCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Views
                  </span>
                  <span className="text-slate-300">{job.viewCount ?? 0}</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Deadline
                    </span>
                    <span className="text-slate-300">
                      {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setApplyOpen(false)}
          />
          <div className="relative glass rounded-2xl p-6 sm:p-8 border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setApplyOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {applySuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Application Submitted!
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Good luck! The employer will review your application.
                </p>
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-1">
                  Apply for {job.title}
                </h3>
                <p className="text-slate-400 text-sm mb-6">at {companyName}</p>

                {applyError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell us why you are a great fit for this role..."
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setApplyOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={applying}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {applying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Application
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
