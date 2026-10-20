"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  ExternalLink,
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
import { DynamicButton } from "@/components/ui/dynamic-button";
import { ProcessingStatus } from "@/components/ui/processing-status";
import { messageFromApiError } from "@/lib/api-error-i18n";

export interface JobDetail {
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
  // Ingestion provenance — null for employer-posted jobs.
  postedById: string | null;
  source: string | null;
  attribution: string | null;
  externalUrl: string | null;
  applyUrl: string | null;
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
  if (score >= 75) return "text-[var(--success)]";
  if (score >= 50) return "text-[var(--warning)]";
  return "text-[var(--text-muted)]";
}

function scoreBar(score: number): string {
  if (score >= 75) return "bg-[var(--success)]";
  if (score >= 50) return "bg-[var(--warning)]";
  return "bg-[var(--surface-3)]";
}

export default function JobDetailClient({
  initialJob,
}: {
  initialJob: JobDetail;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const id = initialJob.id;

  const [job, setJob] = useState<JobDetail | null>(initialJob);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedInitialized, setSavedInitialized] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const applySuccessRef = useRef<HTMLDivElement | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [planLimit, setPlanLimit] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");

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
    if (!id || initialJob) {
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
            // Provenance fields — pass through as-is (may be null).
            postedById:
              typeof j.postedById === "string" ? j.postedById : null,
            source: typeof j.source === "string" ? j.source : null,
            attribution:
              typeof j.attribution === "string" ? j.attribution : null,
            externalUrl:
              typeof j.externalUrl === "string" ? j.externalUrl : null,
            applyUrl: typeof j.applyUrl === "string" ? j.applyUrl : null,
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
  }, [id, t, initialJob]);

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

  // Move focus to the success panel so the result is announced.
  useEffect(() => {
    if (applySuccess) applySuccessRef.current?.focus();
  }, [applySuccess]);

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

  /**
   * Aggregated jobs (postedById === null) cannot accept in-app applications —
   * we do not own them. Instead, "Apply" opens the canonical applyUrl on the
   * source site. Employer jobs keep the existing in-app flow.
   */
  const isAggregated = job?.postedById == null;
  const externalApplyUrl = job?.applyUrl || job?.externalUrl || null;
  const useExternalApply = isAggregated && Boolean(externalApplyUrl);

  function handleApplyClick() {
    if (useExternalApply && externalApplyUrl) {
      window.open(externalApplyUrl, "_blank", "noopener");
      return;
    }
    setApplyOpen(true);
  }

  if (loading) {
    return (
      <div className="gjm-page flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[var(--brand-primary)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">
            {t("Common.loading", "Loading...")}
          </p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="gjm-page flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-8 border border-[var(--border)] max-w-sm">
          <AlertCircle className="w-12 h-12 text-[var(--error)] mx-auto mb-4" />
          <p className="text-[var(--error)] font-medium mb-4">
            {error || t("JobDetail.notFound", "Job not found")}
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--text-on-brand)] px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("JobDetail.backToJobs", "Back to Jobs")}
          </Link>
        </div>
      </div>
    );
  }

  const companyName =
    job.company?.name || t("Companies.unknown", "Unknown company");

  return (
    <div className="gjm-page">
      <div className="gjm-container max-w-5xl">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors"
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
            <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <CompanyLogo
                    name={companyName}
                    logo={job.company?.logo}
                    size={56}
                    priority
                  />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1">
                      {job.title}
                    </h1>
                    <div className="mb-2">
                      <JobMatchBadge jobId={job.id} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {companyName}
                      </span>
                      {job.category && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-xs">
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
                      ? "bg-[var(--brand-accent-soft)] border-[var(--brand-accent)] text-[var(--brand-accent)]"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  title={
                    saved
                      ? t("JobDetail.unsave", "Unsave")
                      : t("JobDetail.save", "Save job")
                  }
                  aria-label={
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

              <div className="flex flex-wrap gap-3 text-sm text-[var(--text-body)] mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  {job.location}
                </span>
                {job.remote && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success-soft)] text-[var(--success)]">
                    <Wifi className="w-3.5 h-3.5" />
                    {t("JobDetail.remote", "Remote")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
                  <Briefcase className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  {job.type}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
                  <DollarSign className="w-3.5 h-3.5 text-[var(--warning)]" />
                  {formatSalary(
                    t,
                    locale,
                    job.currency,
                    job.salaryMin,
                    job.salaryMax,
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  {timeAgo(job.createdAt)}
                </span>
                {job.deadline && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--error)]" />
                    {t("JobDetail.deadline", "Deadline")}{" "}
                    {new Date(job.deadline).toLocaleDateString(locale)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <DynamicButton
                  variant="primary"
                  onClick={handleApplyClick}
                  icon={<Send className="h-4 w-4" />}
                  mirrorIconInRtl
                >
                  {t("JobDetail.apply", "Apply now")}
                </DynamicButton>
                {job.company?.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] text-sm hover:bg-[var(--surface-3)]"
                  >
                    <Globe className="w-4 h-4" />
                    {t("Companies.website", "Website")}
                  </a>
                )}
              </div>

              {/* Source attribution for aggregated jobs (RemoteOK, Jobicy, ...).
                  RemoteOK's API ToS requires a follow link (no rel="nofollow")
                  plus naming the source. */}
              {job.attribution && job.externalUrl && (
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  <a
                    href={job.externalUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 underline decoration-dotted hover:text-[var(--text-body)] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {job.attribution}
                  </a>
                </p>
              )}
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--brand-primary)]" />
                {t("JobDetail.matchScoreTitle", "Your match score")}
              </h2>

              {matchLoading ? (
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
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
                    <span className="text-[var(--text-muted)] text-sm pb-1">
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
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                          <span>{label}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
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
                          className="text-sm text-[var(--text-body)] flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="text-sm text-[var(--text-muted)] space-y-3">
                  <p>
                    {matchMessage ||
                      t("Common.error", "Match score unavailable.")}
                  </p>
                  {(matchMessage || "").toLowerCase().includes("sign in") && (
                    <Link
                      href={`/login?callbackUrl=/jobs/${id}`}
                      className="inline-flex text-[var(--brand-primary)] hover:text-[var(--brand-primary)] font-medium"
                    >
                      {t("Common.signIn", "Sign in")}
                    </Link>
                  )}
                  {(matchMessage || "").toLowerCase().includes("profile") && (
                    <Link
                      href="/profile"
                      className="inline-flex text-[var(--brand-primary)] hover:text-[var(--brand-primary)] font-medium"
                    >
                      {t("Nav.settings", "Settings")}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[var(--brand-primary)]" />
                {t("JobDetail.description", "Description")}
              </h2>
              <div className="text-[var(--text-body)] text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {job.requirements.length > 0 && (
              <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--brand-accent)]" />
                  {t("JobDetail.requirements", "Requirements")}
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[var(--text-body)] text-sm sm:text-base"
                    >
                      <span className="w-5 h-5 rounded-full bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[var(--brand-accent)] text-xs font-bold">
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
              <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--success)]" />
                  {t("JobDetail.responsibilities", "Responsibilities")}
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((resp, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[var(--text-body)] text-sm sm:text-base"
                    >
                      <span className="w-5 h-5 rounded-full bg-[var(--success-soft)] border border-[var(--success)] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[var(--success)] text-xs font-bold">
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
              <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  {t("JobDetail.benefits", "Benefits")}
                </h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {job.benefits.map((b, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-body)] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:w-80">
            <div className="glass rounded-2xl p-5 border border-[var(--border)] space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                {t("JobDetail.stats", "{views} views · {applicants} applicants")
                  .split("{views}")
                  .join(String(job.viewCount))
                  .split("{applicants}")
                  .join(String(job.applicantCount))}
              </p>
              <DynamicButton variant="primary" fullWidth onClick={handleApplyClick}>
                {t("JobDetail.apply", "Apply now")}
              </DynamicButton>
              {/* Sidebar attribution — appears only for aggregated jobs. */}
              {job.attribution && job.externalUrl && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  <a
                    href={job.externalUrl}
                    target="_blank"
                    rel="noopener"
                    className="underline decoration-dotted hover:text-[var(--text-body)] transition-colors"
                  >
                    {job.attribution}
                  </a>
                </p>
              )}
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
          <div className="glass w-full max-w-md rounded-2xl p-6 border border-[var(--border)] relative">
            <button
              type="button"
              onClick={() => {
                setApplyOpen(false);
                setApplyError("");
                setApplySuccess(false);
                setPlanLimit(null);
              }}
              className="absolute top-4 end-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label={t("Common.close", "Close")}
            >
              <X className="w-5 h-5" />
            </button>

            {applySuccess ? (
              <div
                ref={applySuccessRef}
                tabIndex={-1}
                className="space-y-5 outline-none"
              >
                <ProcessingStatus
                  state="success"
                  title={t("JobDetail.applied", "Application submitted")}
                  description={t(
                    "JobDetail.applySuccessBody",
                    "Your application has been sent successfully.",
                  )}
                />
                <div className="flex justify-end">
                  <DynamicButton
                    variant="secondary"
                    onClick={() => setApplyOpen(false)}
                  >
                    {t("Common.close", "Close")}
                  </DynamicButton>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1 pe-8">
                  {t("JobDetail.apply", "Apply now")} — {job.title}
                </h3>
                <p className="text-[var(--text-muted)] text-sm mb-4">{companyName}</p>

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
                  <div className="mb-4 p-3 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm">
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label
                      htmlFor="apply-coverletter"
                      className="block text-sm font-medium text-[var(--text-body)] mb-2"
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
                      className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)] transition-all placeholder:text-[var(--text-subtle)] resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <DynamicButton
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setApplyOpen(false)}
                    >
                      {t("Common.cancel", "Cancel")}
                    </DynamicButton>
                    <DynamicButton
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      status={applying ? "loading" : "idle"}
                      icon={<Send className="h-4 w-4" />}
                      mirrorIconInRtl
                      loadingLabel={t("JobDetail.applying", "Applying...")}
                    >
                      {t("JobDetail.apply", "Apply now")}
                    </DynamicButton>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
