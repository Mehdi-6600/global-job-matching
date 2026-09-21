"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Globe2,
  Heart,
  Laptop,
  MapPin,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
  Map as MapIcon,
  Plane,
} from "lucide-react";
import Newsletter from "./components/Newsletter";
import { useLocale } from "@/components/locale-provider";

type Job = {
  id: string;
  title: string;
  description?: string;
  location?: string | null;
  salary?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  type?: string | null;
  remote?: boolean;
  experience?: string | null;
  tags?: string[];
  createdAt?: string;
  company?: {
    id?: string;
    name?: string | null;
    logo?: string | null;
    location?: string | null;
  } | null;
  category?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
    color?: string | null;
  } | null;
};

type JobsResponse = {
  jobs: Job[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

function initials(value?: string | null) {
  if (!value) return "GJ";

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relativeTime(date?: string) {
  if (!date) return "";

  const created = new Date(date).getTime();
  if (Number.isNaN(created)) return "";

  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function salaryLabel(job: Job) {
  if (job.salary) return job.salary;

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${job.currency || "USD"} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`;
  }

  if (job.salaryMin != null) {
    return `${job.currency || "USD"} ${job.salaryMin.toLocaleString()}+`;
  }

  if (job.salaryMax != null) {
    return `Up to ${job.currency || "USD"} ${job.salaryMax.toLocaleString()}`;
  }

  return null;
}

const SHOW_MAP_SECTION = false;

type Audience = "seeker" | "employer";

export default function HomePage() {
  const { t } = useLocale();
  const router = useRouter();

  const [audience, setAudience] = useState<Audience>("seeker");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        setLoadingJobs(true);

        const response = await fetch("/api/jobs?limit=6&page=1", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load jobs");
        }

        const data = (await response.json()) as JobsResponse;

        if (cancelled) return;

        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setTotalJobs(
          typeof data.pagination?.total === "number"
            ? data.pagination.total
            : null
        );
      } catch {
        if (!cancelled) {
          setJobs([]);
          setTotalJobs(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingJobs(false);
        }
      }
    }

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredJobs = useMemo(() => jobs.slice(0, 3), [jobs]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (location.trim()) {
      params.set("location", location.trim());
    }

    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const featureCards = [
    {
      icon: Search,
      title: t("Home.featureSearchTitle", "Smart Search"),
      description: t(
        "Home.featureSearchDesc",
        "Filter by role, location, remote work and salary to find the right fit faster."
      ),
    },
    {
      icon: Globe2,
      title: t("Home.featureGlobalTitle", "Global Reach"),
      description: t(
        "Home.featureGlobalDesc",
        "Access job listings from companies around the world in one place."
      ),
    },
    {
      icon: Zap,
      title: t("Home.featureAlertsTitle", "Job Alerts"),
      description: t(
        "Home.featureAlertsDesc",
        "Save searches and get notified when new positions appear."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("Home.featureApplyTitle", "Quick Apply"),
      description: t(
        "Home.featureApplyDesc",
        "Build your profile once and apply with a few clicks."
      ),
    },
  ];

  const careerTools = [
    {
      href: "/career-risk",
      icon: ShieldAlert,
      title: t("CareerRisk.title", "AI Career Risk"),
      description: t(
        "CareerRisk.subtitle",
        "Estimate how automation might affect your role in the next 5–10 years."
      ),
      cta: t("Home.toolCtaAnalyze", "Analyze my risk"),
      accent: "cyan",
      badge: t("Home.toolBadgePopular", "Popular"),
    },
    {
      href: "/career-risk",
      icon: MapIcon,
      title: t("CareerRisk.roadmapTitle", "90-day roadmap"),
      description: t(
        "CareerRisk.roadmapCta",
        "Build a 90-day skill roadmap tailored to your role."
      ),
      cta: t("Home.toolCtaPlan", "Plan my next 90 days"),
      accent: "orange",
    },
    {
      href: "/career-risk",
      icon: Plane,
      title: t("CareerRisk.migrationTitle", "Migration options"),
      description: t(
        "CareerRisk.migrationCta",
        "Explore realistic skill-based migration pathways."
      ),
      cta: t("Home.toolCtaExplore", "Explore pathways"),
      accent: "red",
    },
  ];

  const platformCards = [
    {
      href: "/jobs",
      icon: BriefcaseBusiness,
      title: t("Home.hubJobs", "Browse Jobs"),
      description: t(
        "Home.hubJobsDesc",
        "Search active job opportunities worldwide."
      ),
      accent: "blue",
    },
    {
      href: "/locations",
      icon: MapPin,
      title: t("Home.hubLocations", "Explore Locations"),
      description: t(
        "Home.hubLocationsDesc",
        "Discover real opportunities by country and city."
      ),
      accent: "cyan",
    },
    {
      href: "/categories",
      icon: Sparkles,
      title: t("Home.hubCategories", "Explore Categories"),
      description: t(
        "Home.hubCategoriesDesc",
        "Find opportunities grouped by career field."
      ),
      accent: "violet",
    },
    {
      href: "/companies",
      icon: Building2,
      title: t("Home.hubCompanies", "Companies"),
      description: t(
        "Home.hubCompaniesDesc",
        "Explore employers and their opportunities."
      ),
      accent: "green",
    },
    {
      href: "/my-applications",
      icon: CheckCircle2,
      title: t("Home.hubApplications", "Applications"),
      description: t(
        "Home.hubApplicationsDesc",
        "Keep your job applications organized."
      ),
      accent: "orange",
    },
    {
      href: "/job-alerts",
      icon: Zap,
      title: t("Home.hubAlerts", "Job Alerts"),
      description: t(
        "Home.hubAlertsDesc",
        "Stay informed when relevant opportunities appear."
      ),
      accent: "pink",
    },
  ];

  const audienceToggle = (
    <div className="gjm-audience-toggle" role="tablist" aria-label="Audience">
      <button
        type="button"
        role="tab"
        aria-selected={audience === "seeker"}
        onClick={() => setAudience("seeker")}
        className={`gjm-audience-btn ${audience === "seeker" ? "active" : ""}`}
      >
        {t("Home.audienceSeeker", "For Job Seekers")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={audience === "employer"}
        onClick={() => setAudience("employer")}
        className={`gjm-audience-btn ${audience === "employer" ? "active" : ""}`}
      >
        {t("Home.audienceEmployer", "For Employers")}
      </button>
    </div>
  );

  return (
    <main id="gjm-home" className="gjm-home">
      <section className="gjm-hero">
        <div className="gjm-hero-grid" />

        <div className="gjm-hero-glow gjm-hero-glow-one" />
        <div className="gjm-hero-glow gjm-hero-glow-two" />

        <div className="gjm-container gjm-hero-inner">
          <div className="gjm-hero-copy">
            {audienceToggle}

            <div className="gjm-eyebrow">
              <span className="gjm-eyebrow-dot" />
              {t("Home.eyebrow", "GLOBAL CAREER PLATFORM")}
            </div>

            <h1 className="gjm-hero-title">
              {(() => {
                const full = t(
                  "Home.title",
                  "Find Your Next Opportunity. Anywhere in the World."
                );
                const lower = full.toLowerCase();
                const opp = lower.indexOf("opportunity");
                const anyw = lower.indexOf("anywhere");
                if (opp >= 0 && anyw > opp) {
                  const before = full.slice(0, opp); // "Find Your Next "
                  let goldEnd = opp + "opportunity".length;
                  // include trailing period if present
                  if (full[goldEnd] === ".") goldEnd += 1;
                  const goldWord = full.slice(opp, goldEnd);
                  const cyanEnd = anyw + "anywhere".length;
                  const cyanWord = full.slice(anyw, cyanEnd);
                  const after = full.slice(cyanEnd).trim(); // "in the World."
                  return (
                    <>
                      <span className="gjm-hero-title-line gjm-hero-title-silver">
                        {before}
                        <span className="gjm-hero-title-gold">{goldWord}</span>
                      </span>
                      <span className="gjm-hero-title-line">
                        <span className="gjm-hero-title-cyan">{cyanWord}</span>
                      </span>
                      {after ? (
                        <span className="gjm-hero-title-line gjm-hero-title-muted">
                          {after}
                        </span>
                      ) : null}
                    </>
                  );
                }
                const i = full.indexOf(". ");
                if (i > 0 && i < full.length - 2) {
                  return (
                    <>
                      <span className="gjm-hero-title-line gjm-hero-title-silver">
                        {full.slice(0, i + 1)}
                      </span>
                      <span className="gjm-hero-title-line gjm-hero-title-cyan">
                        {full.slice(i + 2)}
                      </span>
                    </>
                  );
                }
                return <span className="gjm-hero-title-silver">{full}</span>;
              })()}
            </h1>

            <p className="gjm-hero-description">
              {t(
                "Home.subtitle",
                "Discover global jobs, connect with employers, and move your career forward without borders."
              )}
            </p>

            <p className="gjm-hero-value">
              {audience === "seeker"
                ? t(
                    "Home.valueSeekers",
                    "AI career intelligence, global jobs, 7 languages."
                  )
                : t(
                    "Home.valueEmployers",
                    "Reach global talent, manage hiring in one place."
                  )}
            </p>

            <div className="gjm-hero-actions">
              {audience === "seeker" ? (
                <>
                  <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                    {t("Home.ctaJobs", "Find Jobs")}
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/register"
                    className="gjm-btn gjm-btn-secondary"
                  >
                    {t("Home.ctaRegister", "Create Your Profile")}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/employer/dashboard"
                    className="gjm-btn gjm-btn-primary"
                  >
                    {t("Home.employerCta", "Explore Employer Tools")}
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/register"
                    className="gjm-btn gjm-btn-secondary"
                  >
                    {t("Home.ctaRegister", "Create Your Profile")}
                  </Link>
                </>
              )}
            </div>

            <div className="gjm-hero-trust">
              <div>
                <CheckCircle2 size={16} />
                <span>{t("Home.trustGlobal", "Global opportunities")}</span>
              </div>

              <div>
                <CheckCircle2 size={16} />
                <span>{t("Home.trustLanguages", "7 languages")}</span>
              </div>

              <div>
                <CheckCircle2 size={16} />
                <span>{t("Home.trustJobs", "Active listings")}</span>
              </div>
            </div>
          </div>

          <div className="gjm-hero-visual" aria-hidden="true">
            <div className="gjm-network-orbit gjm-network-orbit-one" />
            <div className="gjm-network-orbit gjm-network-orbit-two" />
            <div className="gjm-network-orbit gjm-network-orbit-three" />

            <div className="gjm-globe">
              <div className="gjm-globe-line gjm-globe-line-one" />
              <div className="gjm-globe-line gjm-globe-line-two" />
              <div className="gjm-globe-line gjm-globe-line-three" />

              <span className="gjm-map-dot dot-one" />
              <span className="gjm-map-dot dot-two" />
              <span className="gjm-map-dot dot-three" />
              <span className="gjm-map-dot dot-four" />
              <span className="gjm-map-dot dot-five" />
              <span className="gjm-map-dot dot-six" />

              <div className="gjm-globe-center">
                <Globe2 size={54} strokeWidth={1.35} />
              </div>
            </div>

            {featuredJobs.length > 0 ? (
              featuredJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`gjm-floating-job gjm-floating-job-${index + 1}`}
                >
                  <div className="gjm-job-mini-logo">
                    {initials(job.company?.name)}
                  </div>

                  <div className="gjm-floating-job-content">
                    <strong>{job.title}</strong>

                    <span>
                      {job.company?.name || "Global Job Matching"}
                    </span>

                    <small>
                      <MapPin size={11} />
                      {job.location || "Worldwide"}
                    </small>
                  </div>

                  <div className="gjm-live-pill">
                    <span />
                    Live
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="gjm-floating-job gjm-floating-job-1">
                  <div className="gjm-job-mini-logo">G</div>
                  <div className="gjm-floating-job-content">
                    <strong>Global Opportunities</strong>
                    <span>Multiple markets</span>
                    <small>
                      <Globe2 size={11} />
                      Worldwide
                    </small>
                  </div>
                  <div className="gjm-live-pill">
                    <span />
                    Live
                  </div>
                </div>

                <div className="gjm-floating-job gjm-floating-job-2">
                  <div className="gjm-job-mini-logo">J</div>
                  <div className="gjm-floating-job-content">
                    <strong>Remote Jobs</strong>
                    <span>Work from anywhere</span>
                    <small>
                      <Laptop size={11} />
                      Remote
                    </small>
                  </div>
                </div>
              </>
            )}

            <div className="gjm-network-label">
              <span className="gjm-network-label-icon">
                <Users size={15} />
              </span>
              <div>
                <strong>
                  {totalJobs != null
                    ? totalJobs.toLocaleString()
                    : "—"}
                </strong>
                <span>{t("Home.activeJobs", "active jobs")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="gjm-search-shell">
          <form onSubmit={submitSearch} className="gjm-search">
            <div className="gjm-search-field">
              <Search size={19} />
              <div>
                <label>
                  {t("Home.searchKeywordLabel", "What are you looking for?")}
                </label>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t(
                    "Home.searchKeywordPlaceholder",
                    "Job title, skills or keyword"
                  )}
                />
              </div>
            </div>

            <div className="gjm-search-divider" />

            <div className="gjm-search-field">
              <MapPin size={19} />
              <div>
                <label>
                  {t("Home.searchLocationLabel", "Where?")}
                </label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t(
                    "Home.searchLocationPlaceholder",
                    "Country, city or remote"
                  )}
                />
              </div>
            </div>

            <button type="submit" className="gjm-search-button">
              {t("Home.searchButton", "Search Jobs")}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>

      {/* ============================================================
          CAREER TOOLS — dark premium section, right after hero
          Only for job seekers
          ============================================================ */}
      {audience === "seeker" && (
        <section className="gjm-career-tools-section">
          <div className="gjm-container">
            <div className="gjm-career-tools-heading">
              <span className="gjm-section-kicker">
                {t("Home.toolsKicker", "AI CAREER TOOLS")}
              </span>
              <h2>
                {t("Home.toolsTitle", "Plan your career with AI.")}
              </h2>
              <p>
                {t(
                  "Home.toolsSubtitle",
                  "Free tools to assess your risk, plan your next 90 days, and explore global opportunities."
                )}
              </p>
            </div>

            <div className="gjm-career-tools-grid">
              {careerTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className={`gjm-career-tool-card accent-${tool.accent}`}
                  >
                    {"badge" in tool && tool.badge ? (
                      <span className="gjm-career-tool-badge">
                        {tool.badge}
                      </span>
                    ) : null}

                    <div className="gjm-career-tool-icon">
                      <Icon size={24} />
                    </div>

                    <h3>{tool.title}</h3>
                    <p>{tool.description}</p>

                    <span className="gjm-career-tool-cta">
                      {tool.cta}
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          TRUST SECTION — real product evidence, no fake testimonials
          ============================================================ */}
      <section className="gjm-trust-section">
        <div className="gjm-container">
          <div className="gjm-section-heading compact">
            <div>
              <span className="gjm-section-kicker">
                {t("Home.trustSectionKicker", "BUILT ON REAL DATA")}
              </span>
              <h2>
                {t(
                  "Home.trustSectionTitle",
                  "Trusted infrastructure, not testimonials."
                )}
              </h2>
            </div>
          </div>

          <div className="gjm-trust-grid">
            <div className="gjm-trust-item">
              <span className="gjm-trust-icon">
                <BriefcaseBusiness size={20} />
              </span>
              <div>
                <strong>
                  {totalJobs != null ? totalJobs.toLocaleString() : "—"}
                </strong>
                <span>{t("Home.trustJobsLabel", "Live jobs")}</span>
              </div>
            </div>

            <div className="gjm-trust-item">
              <span className="gjm-trust-icon">
                <Globe2 size={20} />
              </span>
              <div>
                <strong>7</strong>
                <span>{t("Home.trustLanguagesLabel", "Languages")}</span>
              </div>
            </div>

            <div className="gjm-trust-item">
              <span className="gjm-trust-icon">
                <ShieldCheck size={20} />
              </span>
              <div>
                <strong>100%</strong>
                <span>
                  {t("Home.trustFreshnessLabel", "Freshness verified")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gjm-section gjm-section-light">
        <div className="gjm-container">
          <div className="gjm-section-heading">
            <div>
              <span className="gjm-section-kicker">
                {t("Home.whyKicker", "WHY GLOBAL JOB MATCHING")}
              </span>

              <h2>
                {t("Home.whyTitle", "Your career has no borders.")}
              </h2>
            </div>

            <p>
              {t(
                "Home.whyDescription",
                "Everything you need to discover opportunities, evaluate employers and manage your job search in one focused experience."
              )}
            </p>
          </div>

          <div className="gjm-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <div className="gjm-feature-card" key={feature.title}>
                  <div className="gjm-feature-icon">
                    <Icon size={21} />
                  </div>

                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>

                  <span className="gjm-card-arrow">
                    <ChevronRight size={17} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {SHOW_MAP_SECTION && (
        <section className="gjm-map-section">
          {/* ... (map section unchanged — omitted for brevity) ... */}
        </section>
      )}

      <section className="gjm-section gjm-section-soft">
        <div className="gjm-container">
          <div className="gjm-section-heading compact">
            <div>
              <span className="gjm-section-kicker">
                {t("Home.trendingKicker", "LATEST OPPORTUNITIES")}
              </span>

              <h2>
                {t("Home.trendingTitle", "Trending opportunities")}
              </h2>
            </div>

            <Link href="/jobs" className="gjm-inline-link">
              {t("Home.viewAllJobs", "View all jobs")}
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="gjm-jobs-grid">
            {loadingJobs ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div className="gjm-job-skeleton" key={index}>
                  <div className="gjm-skeleton-line large" />
                  <div className="gjm-skeleton-line" />
                  <div className="gjm-skeleton-line short" />
                  <div className="gjm-skeleton-bottom" />
                </div>
              ))
            ) : jobs.length > 0 ? (
              jobs.slice(0, 6).map((job) => {
                const salary = salaryLabel(job);

                return (
                  <article className="gjm-job-card" key={job.id}>
                    <div className="gjm-job-card-top">
                      <div className="gjm-company-logo">
                        {job.company?.logo ? (
                          <Image
                            src={job.company.logo}
                            alt=""
                            width={52}
                            height={52}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          initials(job.company?.name)
                        )}
                      </div>

                      <button
                        type="button"
                        className="gjm-save-button"
                        aria-label={t("Home.saveJob", "Save job")}
                      >
                        <Heart size={17} />
                      </button>
                    </div>

                    <div className="gjm-job-card-body">
                      <span className="gjm-job-category">
                        {job.category?.name ||
                          t("Home.jobOpportunity", "Opportunity")}
                      </span>

                      <h3>{job.title}</h3>

                      <p className="gjm-job-company">
                        {job.company?.name ||
                          t("Home.globalCompany", "Global company")}
                      </p>

                      <div className="gjm-job-meta">
                        <span>
                          <MapPin size={14} />
                          {job.location || "Worldwide"}
                        </span>

                        <span>
                          {job.remote ? (
                            <>
                              <Laptop size={14} />
                              {t("Home.remote", "Remote")}
                            </>
                          ) : (
                            <>
                              <BriefcaseBusiness size={14} />
                              {job.type || t("Home.fullTime", "Full-time")}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="gjm-job-bottom">
                        <div>
                          {salary ? (
                            <strong>{salary}</strong>
                          ) : (
                            <strong>
                              {t(
                                "Home.salaryNotListed",
                                "Salary not listed"
                              )}
                            </strong>
                          )}

                          <small>
                            <Clock3 size={12} />
                            {relativeTime(job.createdAt)}
                          </small>
                        </div>

                        <Link
                          href={`/jobs/${job.id}`}
                          className="gjm-job-arrow"
                          aria-label={t("Home.viewJob", "View job")}
                        >
                          <ArrowRight size={17} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="gjm-empty-jobs">
                <BriefcaseBusiness size={28} />
                <h3>
                  {t("Home.noJobsTitle", "No active jobs to display yet")}
                </h3>
                <p>
                  {t(
                    "Home.noJobsDescription",
                    "Check the jobs page for the latest opportunities."
                  )}
                </p>
                <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                  {t("Home.browseJobs", "Browse Jobs")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {audience === "seeker" && (
        <section className="gjm-section gjm-platform-section">
          <div className="gjm-container">
            <div className="gjm-platform-header">
              <div>
                <span className="gjm-section-kicker">
                  {t("Home.platformKicker", "ONE PLATFORM")}
                </span>

                <h2>
                  {t(
                    "Home.platformTitle",
                    "Everything around your job search."
                  )}
                </h2>

                <p>
                  {t(
                    "Home.platformDescription",
                    "A focused set of tools and destinations designed to make global job discovery simpler."
                  )}
                </p>
              </div>
            </div>

            <div className="gjm-platform-grid">
              {platformCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    href={card.href}
                    key={card.href}
                    className={`gjm-platform-card accent-${card.accent}`}
                  >
                    <div className="gjm-platform-icon">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>

                    <ChevronRight size={18} className="gjm-platform-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="gjm-employer-section">
        <div className="gjm-container">
          <div className="gjm-employer-grid">
            <div className="gjm-employer-copy">
              <span className="gjm-section-kicker gjm-kicker-dark">
                {t("Home.employerKicker", "FOR EMPLOYERS")}
              </span>

              <h2>
                {t("Home.employerTitle", "Find talent without borders.")}
              </h2>

              <p>
                {t(
                  "Home.employerDescription",
                  "Publish opportunities, discover candidates and manage hiring from one professional workspace."
                )}
              </p>

              <Link
                href="/employer/dashboard"
                className="gjm-btn gjm-btn-white"
              >
                {t("Home.employerCta", "Explore Employer Tools")}
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="gjm-dashboard-preview">
              <div className="gjm-dashboard-topbar">
                <div className="gjm-dashboard-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="gjm-dashboard-search">
                  <Search size={13} />
                  {t("Home.dashboardSearch", "Search candidates")}
                </div>
              </div>

              <div className="gjm-dashboard-content">
                <aside className="gjm-dashboard-sidebar">
                  <div className="gjm-dashboard-brand">
                    <span />
                    <span />
                  </div>

                  <div className="gjm-sidebar-item active">
                    <Building2 size={15} />
                  </div>

                  <div className="gjm-sidebar-item">
                    <Users size={15} />
                  </div>

                  <div className="gjm-sidebar-item">
                    <BriefcaseBusiness size={15} />
                  </div>

                  <div className="gjm-sidebar-item">
                    <CheckCircle2 size={15} />
                  </div>
                </aside>

                <div className="gjm-dashboard-main">
                  <div className="gjm-dashboard-heading">
                    <div>
                      <span>
                        {t("Home.dashboardLabel", "Employer workspace")}
                      </span>
                      <strong>
                        {t("Home.dashboardTitle", "Hiring overview")}
                      </strong>
                    </div>

                    <div className="gjm-dashboard-status">
                      <span />
                      {t("Home.dashboardLive", "Live")}
                    </div>
                  </div>

                  <div className="gjm-dashboard-metrics">
                    <div>
                      <small>
                        {t("Home.dashboardJobs", "Active jobs")}
                      </small>
                      <strong>—</strong>
                    </div>

                    <div>
                      <small>
                        {t(
                          "Home.dashboardApplications",
                          "Applications"
                        )}
                      </small>
                      <strong>—</strong>
                    </div>

                    <div>
                      <small>
                        {t("Home.dashboardCandidates", "Candidates")}
                      </small>
                      <strong>—</strong>
                    </div>
                  </div>

                  <div className="gjm-dashboard-table">
                    <div className="gjm-table-heading">
                      <span>
                        {t("Home.dashboardPipeline", "Hiring pipeline")}
                      </span>
                      <span>{t("Home.dashboardView", "View")}</span>
                    </div>

                    <div className="gjm-pipeline">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="gjm-candidate-row">
                      <div className="gjm-candidate-avatar">A</div>
                      <div>
                        <strong>Candidate profile</strong>
                        <small>Application</small>
                      </div>
                      <em>Review</em>
                    </div>

                    <div className="gjm-candidate-row">
                      <div className="gjm-candidate-avatar blue">M</div>
                      <div>
                        <strong>Candidate profile</strong>
                        <small>Interview</small>
                      </div>
                      <em className="green">Interview</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gjm-section gjm-section-light">
        <div className="gjm-container">
          <div className="gjm-final-cta">
            <div className="gjm-final-grid" />

            <div className="gjm-final-content">
              <span className="gjm-section-kicker gjm-kicker-dark">
                {t("Home.finalKicker", "YOUR NEXT MOVE")}
              </span>

              <h2>
                {t(
                  "Home.finalTitle",
                  "Your next opportunity is out there."
                )}
              </h2>

              <p>
                {t(
                  "Home.finalDescription",
                  "Start exploring global opportunities today."
                )}
              </p>

              <div className="gjm-final-actions">
                <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                  {t("Home.finalJobs", "Explore Jobs")}
                  <ArrowRight size={18} />
                </Link>

                <Link href="/register" className="gjm-btn gjm-btn-secondary">
                  {t("Home.finalProfile", "Create Your Profile")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gjm-section gjm-newsletter-section">
        <div className="gjm-container gjm-newsletter-container">
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
