"use client";

import { useState, useEffect, useCallback } from "react";
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
  Target,
} from "lucide-react";
import ShareButtons from "@/app/components/ShareButtons";
import { ContactEmployer } from "@/components/contact-employer";
import {
  PlanLimitBanner,
  getPlanLimitFromResponse,
} from "@/components/plan-limit-banner";
import { CompanyLogo } from "@/components/company-logo";
import { useLocale } from "@/components/locale-provider";
import { JobMatchBadge } from "@/components/jobs/job-match-badge";
import { messageFromApiError } from "@/lib/api-error-i18n";

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

type MatchData = {
  score: number;
  breakdown: {
    skills: number;
    location: number;
    experience: number;
    remote: number;
    overall: number;
  };
  reasons: string[];
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
}

function parseMatchData(raw: unknown): MatchData | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const score =
    typeof m.score === "number" && Number.isFinite(m.score) ? m.score : null;
  if (score == null) return null;

  const bd =
    m.breakdown && typeof m.breakdown === "object"
      ? (m.breakdown as Record<string, unknown>)
      : {};

  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const reasons = Array.isArray(m.reasons)
    ? m.reasons.filter((r): r is string => typeof r === "string")
    : [];

  return {
    score,
    breakdown: {
      skills: num(bd.skills),
      location: num(bd.location),
      experience: num(bd.experience),
      remote: num(bd.remote),
      overall: num(bd.overall, score),
    },
    reasons,
  };
}

function interpolate(
  template: string,
  replacements: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(String(value));
  }
  return result;
}

function formatSalary(
  t: (key: string, fallback?: string) => string,
  locale: string,
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
) {
  const cur = currency || "USD";
  if (min == null && max == null) {
    return t("JobDetail.salaryNA", "Salary not specified");
  }
  if (min != null && max != null && min !== max) {
    return `${cur} ${min.toLocaleString(locale)} – ${max.toLocaleString(locale)}`;
  }
  if (min != null && max != null) {
    return `${cur} ${min.toLocaleString(locale)}`;
  }
  if (min != null) {
    return `${t("Jobs.from", "From")} ${cur} ${min.toLocaleString(locale)}`;
  }
  return `${t("Jobs.upTo", "Up to")} ${cur} ${max!.toLocaleString(locale)}`;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-slate-400";
}

function scoreBar(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-slate-500";
}

export default function JobDetailPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const rawParam = params?.id;
  const id = Array.isArray(rawParam)
    ? String(rawParam[0] || "")
    : String(rawParam || "");

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedInitialized, setSavedInitialized] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [planLimit, setPlanLimit] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");

  /* -------------------------------------------------------------- */
  /* Relative time (localized)                                      */
  /* -------------------------------------------------------------- */
  const timeAgo = useCallback(
    (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);

      if (months > 0) {
        return interpolate(t("Common.timeAgo.months", "{count} months ago"), {
          count: months,
        });
      }
      if (days > 0) {
        return interpolate(t("Common.timeAgo.days", "{count} days ago"), {
          count: days,
        });
      }
      if (hours > 0) {
        return interpolate(t("Common.timeAgo.hours", "{count} hours ago"), {
          count: hours,
        });
      }
      if (minutes > 0) {
        return interpolate(
          t("Common.timeAgo.minutes", "{count} minutes ago"),
          { count: minutes },
        );
      }
      return t("Common.timeAgo.justNow", "Just now");
    },
    [t],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setError(t("JobDetail.notFound", "Invalid job ID"));
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/jobs/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
          return;
        }
        if (data.job) {
          const j = data.job;
          setJob({
            ...j,
            title: typeof j.title === "string" ? j.title : "",
            description: typeof j.description === "string" ? j.description : "",
            location: typeof j.location === "string" ? j.location : "",
            type: typeof j.type === "string" ? j.type : "",
            remote: Boolean(j.remote),
            requirements: asStringArray(j.requirements),
            responsibilities: asStringArray(j.responsibilities),
            benefits: asStringArray(j.benefits),
            tags: asStringArray(j.tags),
            applicantCount:
              typeof j.applicantCount === "number" ? j.applicantCount : 0,
            viewCount: typeof j.viewCount === "number" ? j.viewCount : 0,
            company:
              j.company && typeof j.company === "object" ? j.company : null,
            category:
              j.category && typeof j.category === "object" ? j.category : null,
          });
        } else {
          setError(t("JobDetail.notFound", "Job not found"));
        }
      })
      .catch((err) => {
        console.error("[job-detail] load failed", err);
        if (!cancelled) {
          setError(
            t(
              "Common.errorNetwork",
              "Network error. Please try again.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetch(`/api/saved-jobs`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.jobs) ? data.jobs : [];
        const isSaved = list.some((j: { id: string }) => j.id === id);
        setSaved(isSaved);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (!cancelled) setSavedInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setMatchLoading(true);
    setMatchMessage("");
    fetch(`/api/jobs/${id}/match`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 401) {
          setMatch(null);
          setMatchMessage(
            t(
              "JobDetail.loginToApply",
              "Sign in to see your match score for this job.",
            ),
          );
          return;
        }
        if (!res.ok) {
          setMatch(null);
          setMatchMessage(messageFromApiError(res.status, data, t));
          return;
        }
        if (data.match) {
          const parsed = parseMatchData(data.match);
          if (parsed) {
            setMatch(parsed);
            setMatchMessage("");
          } else {
            setMatch(null);
            setMatchMessage(
              t("Common.error", "Could not load match score"),
            );
          }
        } else {
          setMatch(null);
          setMatchMessage(
            data.message ||
              t(
                "JobDetail.loginToApply",
                "Complete your profile to see a match score for this job.",
              ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatch(null);
          setMatchMessage(t("Common.error", "Could not load match score"));
        }
      })
      .finally(() => {
        if (!cancelled) setMatchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleSave = useCallback(async () => {
    if (saveLoading) return;
    setPlanLimit(null);
    setSaveLoading(true);

    const method = saved ? "DELETE" : "POST";

    try {
      const res = await fetch("/api/saved-jobs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?callbackUrl=/jobs/${id}`);
        return;
      }

      if (!res.ok) {
        const limit = getPlanLimitFromResponse(data);
        if (limit) {
          setPlanLimit(limit);
        }
        return;
      }

      setSaved(!saved);
    } catch {
      /* silent */
    } finally {
      setSaveLoading(false);
    }
  }, [id, saved, saveLoading, router]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");
    setPlanLimit(null);
    setApplying(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, coverLetter }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/jobs/${id}`);
          return;
        }

        const limit = getPlanLimitFromResponse(data);
        if (limit) {
          setPlanLimit(limit);
          return;
        }

        setApplyError(messageFromApiError(res.status, data, t));
        return;
      }

      setApplySuccess(true);
      setCoverLetter("");
      if (job) {
        setJob({ ...job, applicantCount: (job.applicantCount || 0) + 1 });
      }
    } catch {
      setApplyError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">
            {t("Common.loading", "Loading...")}
          </p>
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
            {error || t("JobDetail.notFound", "Job not found")}
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("JobDetail.backToJobs", "Back to Jobs")}
          </Link>
        </div>
      </main>
    );
  }

  const companyName =
    job.company?.name || t("Companies.unknown", "Unknown company");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("JobDetail.backToJobs", "Back to all jobs")}
        </Link>

        {planLimit && (
          <div className="mb-6">
            <PlanLimitBanner
              message={planLimit.message}
              code={planLimit.code}
              onClose={() => setPlanLimit(null)}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <CompanyLogo
                    name={companyName}
                    logo={job.company?.logo}
                    size={56}
                    priority
                  />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {job.title}
                    </h1>
                    <div className="mb-2">
                      <JobMatchBadge jobId={job.id} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {companyName}
                      </span>
                      {job.category && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs">
                          {job.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveLoading || !savedInitialized}
                  className={`p-2.5 rounded-xl border transition-all disabled:opacity-60 ${
                    saved
                      ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                  }`}
                  title={
                    saved
                      ? t("JobDetail.unsave", "Unsave")
                      : t("JobDetail.save", "Save job")
                  }
                >
                  {saveLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 ${saved ? "fill-current" : ""}`}
                    />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-300 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {job.location}
                </span>
                {job.remote && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300">
                    <Wifi className="w-3.5 h-3.5" />
                    {t("JobDetail.remote", "Remote")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  {job.type}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  {formatSalary(
                    t,
                    locale,
                    job.currency,
                    job.salaryMin,
                    job.salaryMax,
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {timeAgo(job.createdAt)}
                </span>
                {job.deadline && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" />
                    {t("JobDetail.deadline", "Deadline")}{" "}
                    {new Date(job.deadline).toLocaleDateString(locale)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setApplyOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" />
                  {t("JobDetail.apply", "Apply now")}
                </button>
                {job.company?.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10"
                  >
                    <Globe className="w-4 h-4" />
                    {t("Companies.website", "Website")}
                  </a>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                {t("JobDetail.matchScoreTitle", "Your match score")}
              </h2>

              {matchLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Common.loading", "Loading...")}
                </div>
              ) : match ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-3">
                    <span
                      className={`text-4xl font-bold tabular-nums ${scoreColor(
                        match.score,
                      )}`}
                    >
                      {match.score}%
                    </span>
                    <span className="text-slate-400 text-sm pb-1">
                      {t("JobDetail.overallFit", "overall fit")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        [t("JobDetail.skills", "Skills"), match.breakdown?.skills ?? 0],
                        [
                          t("JobDetail.location", "Location"),
                          match.breakdown?.location ?? 0,
                        ],
                        [
                          t("JobDetail.experience", "Experience"),
                          match.breakdown?.experience ?? 0,
                        ],
                        [t("JobDetail.remote", "Remote"), match.breakdown?.remote ?? 0],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{label}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${scoreBar(value)}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {Array.isArray(match.reasons) && match.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {match.reasons.map((r: string) => (
                        <li
                          key={r}
                          className="text-sm text-slate-300 flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 space-y-3">
                  <p>
                    {matchMessage ||
                      t("Common.error", "Match score unavailable.")}
                  </p>
                  {(matchMessage || "").toLowerCase().includes("sign in") && (
                    <Link
                      href={`/login?callbackUrl=/jobs/${id}`}
                      className="inline-flex text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {t("Common.signIn", "Sign in")}
                    </Link>
                  )}
                  {(matchMessage || "").toLowerCase().includes("profile") && (
                    <Link
                      href="/profile"
                      className="inline-flex text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {t("Nav.settings", "Settings")}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                {t("JobDetail.description", "Description")}
              </h2>
              <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {job.requirements.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  {t("JobDetail.requirements", "Requirements")}
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
                  {t("JobDetail.responsibilities", "Responsibilities")}
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((resp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-300 text-sm sm:text-base"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-emerald-400 text-xs font-bold">
                          {i + 1}
                        </span>
                      </span>
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.benefits.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4">
                  {t("JobDetail.benefits", "Benefits")}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {job.benefits.map((b, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-300 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
              <p className="text-xs text-slate-500">
                {t("JobDetail.stats", "{views} views · {applicants} applicants")
                  .split("{views}")
                  .join(String(job.viewCount))
                  .split("{applicants}")
                  .join(String(job.applicantCount))}
              </p>
              <button
                type="button"
                onClick={() => setApplyOpen(true)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {t("JobDetail.apply", "Apply now")}
              </button>
              <ContactEmployer jobId={job.id} jobTitle={job.title} />
              {shareUrl && (
                <ShareButtons
                  title={`${job.title} at ${companyName}`}
                  url={shareUrl}
                />
              )}
            </div>
          </aside>
        </div>
      </div>

      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="glass w-full max-w-md rounded-2xl p-6 border border-white/10 relative">
            <button
              type="button"
              onClick={() => {
                setApplyOpen(false);
                setApplyError("");
                setApplySuccess(false);
                setPlanLimit(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label={t("Common.close", "Close")}
            >
              <X className="w-5 h-5" />
            </button>

            {applySuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t("JobDetail.applied", "Application submitted")}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {t(
                    "JobDetail.applySuccessBody",
                    "Your application has been sent successfully.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-white text-sm font-medium"
                >
                  {t("Common.close", "Close")}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-1 pr-8">
                  {t("JobDetail.apply", "Apply now")} — {job.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{companyName}</p>

                {planLimit && (
                  <div className="mb-4">
                    <PlanLimitBanner
                      message={planLimit.message}
                      code={planLimit.code}
                      onClose={() => setPlanLimit(null)}
                    />
                  </div>
                )}

                {applyError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label
                      htmlFor="apply-coverletter"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      {t("JobDetail.coverLetterLabel", "Cover Letter (Optional)")}
                    </label>
                    <textarea
                      id="apply-coverletter"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder={t(
                        "JobDetail.coverLetterPlaceholder",
                        "Tell us why you are a great fit for this role...",
                      )}
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
                      {t("Common.cancel", "Cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={applying}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {applying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("JobDetail.applying", "Applying...")}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t("JobDetail.apply", "Apply now")}
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
