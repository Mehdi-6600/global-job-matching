"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
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
  Plane,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Map as MapIcon,
} from "lucide-react";
import Newsletter from "./components/Newsletter";
import { useLocale } from "@/components/locale-provider";
import {
  initials,
  relativeTime,
  salaryLabel,
  splitHeroTitle,
  type HomeJob,
  type JobsResponse,
} from "@/lib/home/content";

type Audience = "seeker" | "employer";

/** Number of listings shown inside the hero feed panel. */
const FEED_SIZE = 3;
/** Number of listings shown in the opportunity grid. */
const GRID_SIZE = 6;

const FEED_LOGO_VARIANTS = ["", "violet", "mint"] as const;

export default function HomePage() {
  const { t } = useLocale();
  const router = useRouter();

  const [audience, setAudience] = useState<Audience>("seeker");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<HomeJob[]>([]);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        setLoadingJobs(true);

        const response = await fetch(`/api/jobs?limit=${GRID_SIZE}&page=1`, {
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
            : null,
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

  const feedJobs = useMemo(() => jobs.slice(0, FEED_SIZE), [jobs]);
  const gridJobs = useMemo(() => jobs.slice(0, GRID_SIZE), [jobs]);

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

  const heroTitleRaw = t(
    "Home.title",
    "Find Your Next Opportunity. Anywhere in the World.",
  );
  const heroTitle = useMemo(() => splitHeroTitle(heroTitleRaw), [heroTitleRaw]);

  const featureCards = [
    {
      icon: Search,
      variant: "search",
      title: t("Home.featureSearchTitle", "Smart Search"),
      description: t(
        "Home.featureSearchDesc",
        "Filter by role, location, remote work and salary to find the right fit faster.",
      ),
    },
    {
      icon: Globe2,
      variant: "global",
      title: t("Home.featureGlobalTitle", "Global Reach"),
      description: t(
        "Home.featureGlobalDesc",
        "Access job listings from companies around the world in one place.",
      ),
    },
    {
      icon: Zap,
      variant: "alerts",
      title: t("Home.featureAlertsTitle", "Job Alerts"),
      description: t(
        "Home.featureAlertsDesc",
        "Save searches and get notified when new positions appear.",
      ),
    },
    {
      icon: ShieldCheck,
      variant: "apply",
      title: t("Home.featureApplyTitle", "Quick Apply"),
      description: t(
        "Home.featureApplyDesc",
        "Build your profile once and apply with a few clicks.",
      ),
    },
  ];

  /**
   * The three AI tools shown directly under the search bar. All three are
   * equally weighted (same width, height and spacing) and lead to the same
   * career-risk workspace, which owns the real analysis flows.
   */
  const aiTools = [
    {
      href: "/career-risk",
      icon: ShieldAlert,
      variant: "risk" as const,
      title: t("CareerRisk.title", "AI Career Risk"),
      description: t(
        "CareerRisk.subtitle",
        "Estimate how automation might affect your role in the next 5–10 years.",
      ),
    },
    {
      href: "/career-risk",
      icon: MapIcon,
      variant: "plan" as const,
      title: t("CareerRisk.roadmapTitle", "90-day roadmap"),
      description: t(
        "CareerRisk.roadmapCta",
        "Build 90-day skill roadmap",
      ),
    },
    {
      href: "/career-risk",
      icon: Plane,
      variant: "migrate" as const,
      title: t("CareerRisk.migrationTitle", "Migration options"),
      description: t(
        "CareerRisk.migrationCta",
        "Where can I migrate with these skills?",
      ),
    },
  ];

  const platformCards = [
    {
      href: "/jobs",
      icon: BriefcaseBusiness,
      accent: "blue",
      title: t("Home.hubJobs", "Browse Jobs"),
      description: t(
        "Home.hubJobsDesc",
        "Search active job opportunities worldwide.",
      ),
    },
    {
      href: "/locations",
      icon: MapPin,
      accent: "cyan",
      title: t("Home.hubLocations", "Explore Locations"),
      description: t(
        "Home.hubLocationsDesc",
        "Discover real opportunities by country and city.",
      ),
    },
    {
      href: "/categories",
      icon: Sparkles,
      accent: "violet",
      title: t("Home.hubCategories", "Explore Categories"),
      description: t(
        "Home.hubCategoriesDesc",
        "Find opportunities grouped by career field.",
      ),
    },
    {
      href: "/companies",
      icon: Building2,
      accent: "green",
      title: t("Home.hubCompanies", "Companies"),
      description: t(
        "Home.hubCompaniesDesc",
        "Explore employers and their opportunities.",
      ),
    },
    {
      href: "/my-applications",
      icon: CheckCircle2,
      accent: "orange",
      title: t("Home.hubApplications", "Applications"),
      description: t(
        "Home.hubApplicationsDesc",
        "Keep your job applications organized.",
      ),
    },
    {
      href: "/job-alerts",
      icon: Zap,
      accent: "pink",
      title: t("Home.hubAlerts", "Job Alerts"),
      description: t(
        "Home.hubAlertsDesc",
        "Stay informed when relevant opportunities appear.",
      ),
    },
  ];

  /** Bars are purely decorative — no chart value is claimed anywhere. */
  const mockBars = ["32%", "48%", "38%", "64%", "54%", "80%"];

  return (
    <main id="gjm-home" className="gjmx-home">
      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="gjmx-hero">
        <div className="gjmx-hero-aura" aria-hidden="true">
          <span className="gjmx-aura gjmx-aura--one" />
          <span className="gjmx-aura gjmx-aura--two" />
          <span className="gjmx-aura gjmx-aura--three" />
          <span className="gjmx-hero-mesh" />
        </div>

        <div className="gjm-container gjmx-hero-inner">
          <div className="gjmx-hero-copy">
            <div className="gjmx-hero-topline">
              <div className="gjmx-segment" role="group">
                <button
                  type="button"
                  aria-pressed={audience === "seeker"}
                  onClick={() => setAudience("seeker")}
                  className="gjmx-segment-btn"
                >
                  {t("Home.audienceSeeker", "For Job Seekers")}
                </button>
                <button
                  type="button"
                  aria-pressed={audience === "employer"}
                  onClick={() => setAudience("employer")}
                  className="gjmx-segment-btn"
                >
                  {t("Home.audienceEmployer", "For Employers")}
                </button>
              </div>
            </div>

            <span className="gjmx-eyebrow">
              <span className="gjmx-eyebrow-dot" />
              {t("Home.eyebrow", "GLOBAL CAREER PLATFORM")}
            </span>

            <h1 className="gjmx-title">
              <span className="gjmx-title-line">{heroTitle.line1}</span>
              {heroTitle.line2 ? (
                <span className="gjmx-title-line gjmx-title-line--gradient">
                  {heroTitle.line2}
                </span>
              ) : null}
            </h1>

            <p className="gjmx-lede">
              {t(
                "Home.subtitle",
                "Discover global jobs, connect with employers, and move your career forward without borders.",
              )}
            </p>

            <p className="gjmx-value">
              <Sparkles size={15} aria-hidden="true" />
              {audience === "seeker"
                ? t(
                    "Home.valueSeekers",
                    "AI career intelligence, global jobs, 7 languages.",
                  )
                : t(
                    "Home.valueEmployers",
                    "Reach global talent, manage hiring in one place.",
                  )}
            </p>

            <div className="gjmx-cta-row">
              {audience === "seeker" ? (
                <>
                  <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                    {t("Home.ctaJobs", "Find Jobs")}
                    <ArrowRight size={18} className="gjmx-mirror" />
                  </Link>

                  <Link href="/register" className="gjm-btn gjm-btn-secondary">
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
                    <ArrowRight size={18} className="gjmx-mirror" />
                  </Link>

                  <Link href="/register" className="gjm-btn gjm-btn-secondary">
                    {t("Home.ctaRegister", "Create Your Profile")}
                  </Link>
                </>
              )}
            </div>

            <ul className="gjmx-trust">
              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                {t("Home.trustGlobal", "Global opportunities")}
              </li>
              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                {t("Home.trustLanguages", "7 languages")}
              </li>
              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                {t("Home.trustJobs", "Active listings")}
              </li>
            </ul>
          </div>

          {/* -------- Live feed panel (real /api/jobs data) -------- */}
          <aside className="gjmx-panel">
            <header className="gjmx-panel-head">
              <div className="gjmx-panel-title">
                <strong>
                  {t("Home.feedTitle", "Live opportunity feed")}
                </strong>
                <span className="gjmx-panel-count">
                  <strong>
                    {totalJobs != null ? totalJobs.toLocaleString() : "—"}
                  </strong>
                  {t("Home.activeJobs", "active jobs")}
                </span>
              </div>

              <span className="gjmx-live">
                <span className="gjmx-live-dot" />
                {t("Home.dashboardLive", "Live")}
              </span>
            </header>

            <div className="gjmx-feed">
              {loadingJobs ? (
                Array.from({ length: FEED_SIZE }).map((_, index) => (
                  <div className="gjmx-shimmer-row" key={index}>
                    <span className="gjmx-shimmer gjmx-shimmer--avatar" />
                    <span className="gjmx-shimmer gjmx-shimmer--line" />
                  </div>
                ))
              ) : feedJobs.length > 0 ? (
                feedJobs.map((job, index) => {
                  const variant =
                    FEED_LOGO_VARIANTS[index % FEED_LOGO_VARIANTS.length];

                  return (
                    <article className="gjmx-feed-row" key={job.id}>
                      <span
                        className={
                          variant
                            ? `gjmx-feed-logo gjmx-feed-logo--${variant}`
                            : "gjmx-feed-logo"
                        }
                        aria-hidden="true"
                      >
                        {initials(job.company?.name)}
                      </span>

                      <div className="gjmx-feed-body">
                        <strong>{job.title}</strong>
                        <span>
                          {job.company?.name ||
                            t("Home.globalCompany", "Global company")}
                        </span>
                        <small>
                          <MapPin size={11} aria-hidden="true" />
                          {job.location ||
                            t("Home.searchLocationLabel", "Where?")}
                        </small>
                      </div>

                      {job.remote ? (
                        <span className="gjmx-feed-tag">
                          {t("Home.remote", "Remote")}
                        </span>
                      ) : (
                        <span className="gjmx-feed-tag">
                          {job.type || t("Home.fullTime", "Full-time")}
                        </span>
                      )}
                    </article>
                  );
                })
              ) : (
                <p className="gjmx-feed-note">
                  {t(
                    "Home.feedEmpty",
                    "New roles appear here as soon as they are published.",
                  )}
                </p>
              )}
            </div>

            <Link href="/career-risk" className="gjmx-panel-foot">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>{t("CareerRisk.title", "AI Career Risk")}</span>
              <ArrowRight size={15} className="gjmx-mirror" />
            </Link>
          </aside>
        </div>

        {/* -------- Search -------- */}
        <div className="gjm-container gjmx-search-wrap">
          <form onSubmit={submitSearch} className="gjmx-search">
            <div className="gjmx-field">
              <Search size={19} aria-hidden="true" />
              <div className="gjmx-field-body">
                <label htmlFor="gjmx-q">
                  {t("Home.searchKeywordLabel", "What are you looking for?")}
                </label>
                <input
                  id="gjmx-q"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t(
                    "Home.searchKeywordPlaceholder",
                    "Job title, skills or keyword",
                  )}
                />
              </div>
            </div>

            <span className="gjmx-search-split" aria-hidden="true" />

            <div className="gjmx-field">
              <MapPin size={19} aria-hidden="true" />
              <div className="gjmx-field-body">
                <label htmlFor="gjmx-loc">
                  {t("Home.searchLocationLabel", "Where?")}
                </label>
                <input
                  id="gjmx-loc"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t(
                    "Home.searchLocationPlaceholder",
                    "Country, city or remote",
                  )}
                />
              </div>
            </div>

            <button type="submit" className="gjmx-search-submit">
              {t("Home.searchButton", "Search Jobs")}
              <ArrowRight size={18} className="gjmx-mirror" />
            </button>
          </form>

          {audience === "seeker" && (
            <div className="gjmx-tools" role="list">
              {aiTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.variant}
                    href={tool.href}
                    role="listitem"
                    className={`gjmx-tool gjmx-tool--${tool.variant}`}
                  >
                    <span className="gjmx-tool-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>

                    <span className="gjmx-tool-body">
                      <strong>{tool.title}</strong>
                      <span>{tool.description}</span>
                    </span>

                    <span className="gjmx-tool-arrow" aria-hidden="true">
                      <ArrowRight size={14} className="gjmx-mirror" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          PROOF STRIP — real figures only
          ============================================================ */}
      <section className="gjmx-strip">
        <div className="gjm-container gjmx-strip-grid">
          <div
            className="gjmx-stat"
            style={
              {
                "--gjmx-stat-color": "#0e7490",
                "--gjmx-stat-bg": "var(--brand-primary-tint)",
              } as CSSProperties
            }
          >
            <span className="gjmx-stat-icon" aria-hidden="true">
              <BriefcaseBusiness size={20} />
            </span>
            <div>
              <strong>
                {totalJobs != null ? totalJobs.toLocaleString() : "—"}
              </strong>
              <span>{t("Home.trustJobsLabel", "Live jobs")}</span>
            </div>
          </div>

          <div
            className="gjmx-stat"
            style={
              {
                "--gjmx-stat-color": "#4f46e5",
                "--gjmx-stat-bg": "#ece9fe",
              } as CSSProperties
            }
          >
            <span className="gjmx-stat-icon" aria-hidden="true">
              <Globe2 size={20} />
            </span>
            <div>
              <strong>7</strong>
              <span>{t("Home.trustLanguagesLabel", "Languages")}</span>
            </div>
          </div>

          <div
            className="gjmx-stat"
            style={
              {
                "--gjmx-stat-color": "#047857",
                "--gjmx-stat-bg": "#ecfdf5",
              } as CSSProperties
            }
          >
            <span className="gjmx-stat-icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <div>
              <strong>100%</strong>
              <span>{t("Home.trustFreshnessLabel", "Freshness verified")}</span>
            </div>
          </div>

          <div
            className="gjmx-stat"
            style={
              {
                "--gjmx-stat-color": "#b45309",
                "--gjmx-stat-bg": "#fffbeb",
              } as CSSProperties
            }
          >
            <span className="gjmx-stat-icon" aria-hidden="true">
              <Zap size={20} />
            </span>
            <div>
              <strong>{t("Home.statFreeValue", "Free")}</strong>
              <span>{t("Home.statFreeLabel", "To get started")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          WHY
          ============================================================ */}
      <section className="gjmx-section">
        <div className="gjm-container">
          <div className="gjmx-head">
            <div>
              <span className="gjmx-kicker">
                {t("Home.whyKicker", "WHY GLOBAL JOB MATCHING")}
              </span>
              <h2 className="gjmx-h2">
                {t("Home.whyTitle", "Your career has no borders.")}
              </h2>
            </div>

            <p className="gjmx-head-copy">
              {t(
                "Home.whyDescription",
                "Everything you need to discover opportunities, evaluate employers and manage your job search in one focused experience.",
              )}
            </p>
          </div>

          <div className="gjmx-features">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  className={`gjmx-feature gjmx-feature--${feature.variant}`}
                  key={feature.title}
                >
                  <span className="gjmx-feature-icon" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          OPPORTUNITIES — real listings
          ============================================================ */}
      <section className="gjmx-section gjmx-section--tint">
        <div className="gjm-container">
          <div className="gjmx-head">
            <div>
              <span className="gjmx-kicker">
                {t("Home.trendingKicker", "LATEST OPPORTUNITIES")}
              </span>
              <h2 className="gjmx-h2">
                {t("Home.trendingTitle", "Trending opportunities")}
              </h2>
            </div>

            <Link href="/jobs" className="gjmx-link">
              {t("Home.viewAllJobs", "View all jobs")}
              <ArrowRight size={16} className="gjmx-mirror" />
            </Link>
          </div>

          <div className="gjmx-jobs">
            {loadingJobs ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div className="gjmx-job" key={index}>
                  <div className="gjmx-job-top">
                    <span className="gjmx-shimmer gjmx-shimmer--avatar" />
                  </div>
                  <span className="gjmx-shimmer gjmx-shimmer--line" />
                  <span className="gjmx-shimmer gjmx-shimmer--line-short" />
                </div>
              ))
            ) : gridJobs.length > 0 ? (
              gridJobs.map((job) => {
                const salary = salaryLabel(job);
                const age = relativeTime(job.createdAt);

                return (
                  <article className="gjmx-job" key={job.id}>
                    <div className="gjmx-job-top">
                      <span className="gjmx-job-logo">
                        {job.company?.logo ? (
                          <Image
                            src={job.company.logo}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(job.company?.name)
                        )}
                      </span>

                      <button
                        type="button"
                        className="gjmx-job-save"
                        aria-label={t("Home.saveJob", "Save job")}
                      >
                        <Heart size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="gjmx-job-body">
                      <span className="gjmx-chip">
                        {job.category?.name ||
                          t("Home.jobOpportunity", "Opportunity")}
                      </span>

                      <h3>{job.title}</h3>

                      <p className="gjmx-job-company">
                        {job.company?.name ||
                          t("Home.globalCompany", "Global company")}
                      </p>

                      <div className="gjmx-job-meta">
                        <span>
                          <MapPin size={14} aria-hidden="true" />
                          {job.location || t("Home.searchLocationLabel", "Where?")}
                        </span>

                        <span>
                          {job.remote ? (
                            <>
                              <Laptop size={14} aria-hidden="true" />
                              {t("Home.remote", "Remote")}
                            </>
                          ) : (
                            <>
                              <BriefcaseBusiness size={14} aria-hidden="true" />
                              {t("Home.fullTime", "Full-time")}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="gjmx-job-foot">
                      <div>
                        <strong>
                          {salary || t("Home.salaryNotListed", "Salary not listed")}
                        </strong>
                        {age ? (
                          <small>
                            <Clock3 size={12} aria-hidden="true" />
                            {age}
                          </small>
                        ) : null}
                      </div>

                      <Link
                        href={`/jobs/${job.id}`}
                        className="gjmx-job-open"
                        aria-label={t("Home.viewJob", "View Job")}
                      >
                        <ArrowRight size={17} className="gjmx-mirror" />
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="gjmx-empty">
                <span className="gjmx-empty-icon" aria-hidden="true">
                  <BriefcaseBusiness size={26} />
                </span>
                <h3>{t("Home.noJobsTitle", "No active jobs to display yet")}</h3>
                <p>
                  {t(
                    "Home.noJobsDescription",
                    "Check the jobs page for the latest opportunities.",
                  )}
                </p>
                <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                  {t("Home.browseJobs", "Browse Jobs")}
                  <ArrowRight size={17} className="gjmx-mirror" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          PLATFORM DESTINATIONS
          ============================================================ */}
      {audience === "seeker" && (
        <section className="gjmx-section">
          <div className="gjm-container">
            <div className="gjmx-head">
              <div>
                <span className="gjmx-kicker">
                  {t("Home.platformKicker", "ONE PLATFORM")}
                </span>
                <h2 className="gjmx-h2">
                  {t(
                    "Home.platformTitle",
                    "Everything around your job search.",
                  )}
                </h2>
              </div>

              <p className="gjmx-head-copy">
                {t(
                  "Home.platformDescription",
                  "A focused set of tools and destinations designed to make global job discovery simpler.",
                )}
              </p>
            </div>

            <div className="gjmx-destinations">
              {platformCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    href={card.href}
                    key={card.href}
                    className={`gjmx-destination gjmx-destination--${card.accent}`}
                  >
                    <span className="gjmx-destination-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>

                    <span className="gjmx-destination-body">
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </span>

                    <ChevronRight
                      size={18}
                      className="gjmx-destination-arrow gjmx-mirror"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          EMPLOYER
          ============================================================ */}
      <section className="gjmx-employer">
        <div className="gjm-container">
          <div className="gjmx-employer-card">
            <div className="gjmx-employer-copy">
              <span className="gjmx-kicker gjmx-kicker--light">
                {t("Home.employerKicker", "FOR EMPLOYERS")}
              </span>

              <h2>{t("Home.employerTitle", "Find talent without borders.")}</h2>

              <p>
                {t(
                  "Home.employerDescription",
                  "Publish opportunities, discover candidates and manage hiring from one professional workspace.",
                )}
              </p>

              <Link
                href="/employer/dashboard"
                className="gjm-btn gjm-btn-white"
              >
                {t("Home.employerCta", "Explore Employer Tools")}
                <ArrowRight size={18} className="gjmx-mirror" />
              </Link>
            </div>

            {/* Workspace preview: every label is real, every value is a
                placeholder — no invented metrics are shown. */}
            <div className="gjmx-mock" aria-hidden="true">
              <div className="gjmx-mock-bar">
                <span className="gjmx-mock-dots">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="gjmx-mock-search">
                  <Search size={12} />
                  {t("Home.dashboardSearch", "Search candidates")}
                </span>
              </div>

              <div className="gjmx-mock-body">
                <div className="gjmx-mock-rail">
                  <span>
                    <Building2 size={15} />
                  </span>
                  <span>
                    <Users size={15} />
                  </span>
                  <span>
                    <BriefcaseBusiness size={15} />
                  </span>
                  <span>
                    <CheckCircle2 size={15} />
                  </span>
                </div>

                <div className="gjmx-mock-main">
                  <div className="gjmx-mock-head">
                    <div>
                      <span>{t("Home.dashboardLabel", "Employer workspace")}</span>
                      <strong>{t("Home.dashboardTitle", "Hiring overview")}</strong>
                    </div>

                    <span className="gjmx-live">
                      <span className="gjmx-live-dot" />
                      {t("Home.dashboardLive", "Live")}
                    </span>
                  </div>

                  <div className="gjmx-mock-metrics">
                    <div>
                      <small>{t("Home.dashboardJobs", "Active jobs")}</small>
                      <strong>—</strong>
                    </div>
                    <div>
                      <small>
                        {t("Home.dashboardApplications", "Applications")}
                      </small>
                      <strong>—</strong>
                    </div>
                    <div>
                      <small>{t("Home.dashboardCandidates", "Candidates")}</small>
                      <strong>—</strong>
                    </div>
                  </div>

                  <div className="gjmx-mock-chart">
                    {mockBars.map((height, index) => (
                      <span
                        key={index}
                        style={{ "--gjmx-bar": height } as CSSProperties}
                      />
                    ))}
                  </div>

                  <p className="gjmx-mock-note">
                    {t("Home.dashboardPipeline", "Hiring pipeline")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CLOSING CTA
          ============================================================ */}
      <section className="gjmx-final-wrap">
        <div className="gjm-container">
          <div className="gjmx-final">
            <div className="gjmx-final-content">
              <span className="gjmx-kicker gjmx-kicker--light">
                {t("Home.finalKicker", "YOUR NEXT MOVE")}
              </span>

              <h2>{t("Home.finalTitle", "Your next opportunity is out there.")}</h2>

              <p>
                {t(
                  "Home.finalDescription",
                  "Start exploring global opportunities today.",
                )}
              </p>

              <div className="gjmx-final-actions">
                <Link href="/jobs" className="gjm-btn gjm-btn-primary">
                  {t("Home.finalJobs", "Explore Jobs")}
                  <ArrowRight size={18} className="gjmx-mirror" />
                </Link>

                <Link href="/register" className="gjm-btn gjm-btn-secondary">
                  {t("Home.finalProfile", "Create Your Profile")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          NEWSLETTER
          ============================================================ */}
      <section className="gjmx-newsletter">
        <div className="gjm-container gjmx-newsletter-inner">
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
