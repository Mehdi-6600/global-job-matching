"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileText,
  Globe2,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { locales } from "@/lib/i18n/config";
import {
  initials,
  salaryLabel,
  splitHeroTitle,
  type HomeJob,
  type JobsResponse,
} from "@/lib/home/content";
import Newsletter from "./components/Newsletter";
import FeaturedUrgencyBanner from "@/components/featured-urgency-banner";

type Audience = "seeker" | "employer";

const HOME_JOB_LIMIT = 3;

export default function HomePage() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [audience, setAudience] = useState<Audience>("seeker");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<HomeJob[]>([]);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoadingJobs(true);
      setJobsError(false);

      try {
        const response = await fetch(
          `/api/jobs?limit=${HOME_JOB_LIMIT}&page=1`,
          { cache: "no-store" },
        );

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
          setJobsError(true);
        }
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const heroTitle = useMemo(
    () =>
      splitHeroTitle(
        t("Home.title", "Find Your Next Opportunity. Anywhere in the World."),
      ),
    [t],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (location.trim()) params.set("location", location.trim());

    const query = params.toString();
    router.push(`/jobs${query ? `?${query}` : ""}`);
  }

  const discoveryLinks = [
    {
      href: "/locations",
      icon: MapPin,
      title: t("Home.hubLocations", "Explore Locations"),
      description: t(
        "Home.hubLocationsDesc",
        "Discover real opportunities by country and city.",
      ),
    },
    {
      href: "/categories",
      icon: Sparkles,
      title: t("Home.hubCategories", "Explore Categories"),
      description: t(
        "Home.hubCategoriesDesc",
        "Find opportunities grouped by career field.",
      ),
    },
    {
      href: "/companies",
      icon: Building2,
      title: t("Home.hubCompanies", "Companies"),
      description: t(
        "Home.hubCompaniesDesc",
        "Explore employers and their opportunities.",
      ),
    },
    {
      href: "/career-risk",
      icon: ShieldAlert,
      title: t("CareerRisk.title", "AI Career Risk"),
      description: t(
        "CareerRisk.subtitle",
        "Estimate how automation might affect your role in the next 5–10 years.",
      ),
    },
    {
      href: "/resume-builder",
      icon: FileText,
      title: t("Resume.title", "AI Resume Builder"),
      description: t(
        "Resume.subtitle",
        "Fill your details — generate a professional resume",
      ),
    },
    {
      href: "/job-alerts",
      icon: Zap,
      title: t("Home.hubAlerts", "Job Alerts"),
      description: t(
        "Home.hubAlertsDesc",
        "Stay informed when relevant opportunities appear.",
      ),
    },
  ];

  const primaryHref = audience === "seeker" ? "/jobs" : "/employer/dashboard";
  const primaryLabel =
    audience === "seeker"
      ? t("Home.ctaJobs", "Find Jobs")
      : t("Home.employerCta", "Explore Employer Tools");

  return (
    <div id="gjm-home" className="gjmx-home">
      <section className="gjmx-hero">
        <div className="gjm-container gjmx-hero-grid">
          <div className="gjmx-hero-copy">
            <div
              className="gjmx-audience"
              role="group"
              aria-label={t("Home.audienceLabel", "Choose your audience")}
            >
              <button
                type="button"
                aria-pressed={audience === "seeker"}
                onClick={() => setAudience("seeker")}
                className="gjmx-audience-button"
              >
                {t("Home.audienceSeeker", "For Job Seekers")}
              </button>
              <button
                type="button"
                aria-pressed={audience === "employer"}
                onClick={() => setAudience("employer")}
                className="gjmx-audience-button"
              >
                {t("Home.audienceEmployer", "For Employers")}
              </button>
            </div>

            <p className="gjmx-eyebrow">
              <span className="gjmx-eyebrow-mark" aria-hidden="true">
                <Globe2 size={14} />
              </span>
              {t("Home.eyebrow", "GLOBAL CAREER PLATFORM")}
            </p>

            <h1 className="gjmx-title">
              <span className="gjmx-title-line">{heroTitle.line1}</span>
              {heroTitle.line2 ? (
                <span className="gjmx-title-line gjmx-title-line--accent">
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
              <Sparkles size={16} aria-hidden="true" />
              {audience === "seeker"
                ? t(
                    "Home.valueSeekers",
                    "AI career intelligence, global jobs, 12 languages.",
                  )
                : t(
                    "Home.valueEmployers",
                    "Reach global talent, manage hiring in one place.",
                  )}
            </p>

            <div className="gjmx-hero-actions">
              <Link href={primaryHref} className="gjm-btn gjm-btn-primary">
                {primaryLabel}
                <ArrowRight size={18} className="gjmx-mirror" aria-hidden="true" />
              </Link>
              <Link href="/register" className="gjm-btn gjm-btn-secondary">
                {t("Home.ctaRegister", "Create Your Profile")}
              </Link>
            </div>
          </div>

          <aside className="gjmx-world-card" aria-labelledby="gjmx-world-label">
            <div className="gjmx-world-card-top">
              <span className="gjmx-world-label" id="gjmx-world-label">
                <span className="gjmx-world-label-dot" aria-hidden="true" />
                {t("Home.trustGlobal", "Global opportunities")}
              </span>
              <span className="gjmx-world-mark" aria-hidden="true">
                <BriefcaseBusiness size={17} />
              </span>
            </div>

            <div className="gjmx-world-graphic" aria-hidden="true">
              <svg viewBox="0 0 440 300" fill="none" role="presentation">
                <circle className="gjmx-globe-outline" cx="220" cy="148" r="112" />
                <ellipse className="gjmx-globe-line" cx="220" cy="148" rx="52" ry="112" />
                <ellipse className="gjmx-globe-line" cx="220" cy="148" rx="92" ry="112" />
                <path className="gjmx-globe-line" d="M110 148h220M126 102c27 17 60 25 94 25s67-8 94-25M126 194c27-17 60-25 94-25s67 8 94 25" />
                <path className="gjmx-route" d="M111 105c34-31 66-37 102-10 28 21 52 26 93 3M143 207c34-20 58-17 83 4 28 23 55 20 100-19" />
                <circle className="gjmx-route-node" cx="111" cy="105" r="5" />
                <circle className="gjmx-route-node" cx="306" cy="98" r="5" />
                <circle className="gjmx-route-node" cx="143" cy="207" r="5" />
                <circle className="gjmx-route-node" cx="326" cy="192" r="5" />
                <circle className="gjmx-route-center" cx="220" cy="148" r="5" />
              </svg>
            </div>

            <div className="gjmx-world-stats" aria-busy={loadingJobs}>
              <div className="gjmx-world-stat">
                <strong>{totalJobs == null ? "—" : totalJobs.toLocaleString(locale)}</strong>
                <span>{t("Home.activeJobs", "active jobs")}</span>
              </div>
              <span className="gjmx-world-divider" aria-hidden="true" />
              <div className="gjmx-world-stat">
                <strong>{locales.length}</strong>
                <span>{t("Home.trustLanguagesLabel", "Languages")}</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="gjm-container gjmx-search-wrap">
          <form onSubmit={submitSearch} className="gjmx-search" role="search">
            <div className="gjmx-field">
              <Search className="gjmx-field-icon" size={19} aria-hidden="true" />
              <div className="gjmx-field-body">
                <label htmlFor="gjmx-keyword">
                  {t("Home.searchKeywordLabel", "What are you looking for?")}
                </label>
                <input
                  id="gjmx-keyword"
                  name="search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t(
                    "Home.searchKeywordPlaceholder",
                    "Job title, skills or keyword",
                  )}
                />
              </div>
            </div>

            <div className="gjmx-field">
              <MapPin className="gjmx-field-icon" size={19} aria-hidden="true" />
              <div className="gjmx-field-body">
                <label htmlFor="gjmx-location">
                  {t("Home.searchLocationLabel", "Where?")}
                </label>
                <input
                  id="gjmx-location"
                  name="location"
                  type="search"
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
              <Search size={17} aria-hidden="true" />
              <span>{t("Home.searchButton", "Search Jobs")}</span>
            </button>
          </form>
        </div>
      </section>

      <div className="gjm-container" style={{ marginTop: "12px" }}>
        <FeaturedUrgencyBanner />
      </div>

      <section className="gjmx-jobs-section" aria-labelledby="gjmx-jobs-title">
        <div className="gjm-container">
          <div className="gjmx-section-heading">
            <div>
              <p className="gjmx-section-kicker">
                {t("Home.trendingKicker", "LATEST OPPORTUNITIES")}
              </p>
              <h2 id="gjmx-jobs-title" className="gjmx-section-title">
                {t("Home.trendingTitle", "Trending opportunities")}
              </h2>
            </div>

            <Link href="/jobs" className="gjmx-text-link">
              {t("Home.viewAllJobs", "View all jobs")}
              <ArrowRight size={17} className="gjmx-mirror" aria-hidden="true" />
            </Link>
          </div>

          <div className="gjmx-job-grid" aria-busy={loadingJobs}>
            {loadingJobs ? (
              Array.from({ length: HOME_JOB_LIMIT }).map((_, index) => (
                <div className="gjmx-job-skeleton" key={index} aria-hidden="true">
                  <span className="gjmx-skeleton-logo" />
                  <span className="gjmx-skeleton-line" />
                  <span className="gjmx-skeleton-line gjmx-skeleton-line--short" />
                  <span className="gjmx-skeleton-rule" />
                </div>
              ))
            ) : jobsError ? (
              <div className="gjmx-jobs-empty" role="status">
                <span className="gjmx-empty-icon" aria-hidden="true">
                  <BriefcaseBusiness size={22} />
                </span>
                <h3>{t("Jobs.loadErrorTitle", "Could not load jobs")}</h3>
                <p>{t("Jobs.loadErrorBody", "Something went wrong. Please try again.")}</p>
                <button
                  type="button"
                  className="gjmx-retry-button"
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  {t("Common.retry", "Try again")}
                </button>
              </div>
            ) : jobs.length > 0 ? (
              jobs.map((job) => {
                const salary = salaryLabel(
                  job,
                  locale,
                  t("Jobs.upTo", "Up to"),
                );
                const companyName =
                  job.company?.name || t("Home.globalCompany", "Global company");
                const typeLabel = job.type?.trim();
                const hasRemoteType = typeLabel?.toLowerCase() === "remote";

                return (
                  <article className="gjmx-job-card" key={job.id}>
                    <div className="gjmx-job-main">
                      <span className="gjmx-job-logo" aria-hidden="true">
                        {job.company?.logo ? (
                          <Image
                            src={job.company.logo}
                            alt=""
                            width={48}
                            height={48}
                            className="gjmx-job-logo-image"
                          />
                        ) : (
                          initials(job.company?.name)
                        )}
                      </span>

                      <div className="gjmx-job-content">
                        <h3>
                          <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                        </h3>
                        <p className="gjmx-job-company">{companyName}</p>
                      </div>
                    </div>

                    <div className="gjmx-job-details">
                      {job.location ? (
                        <span className="gjmx-job-detail">
                          <MapPin size={14} aria-hidden="true" />
                          <span>{job.location}</span>
                        </span>
                      ) : null}
                      {job.remote || hasRemoteType ? (
                        <span className="gjmx-job-type">
                          {t("Home.remote", "Remote")}
                        </span>
                      ) : null}
                      {typeLabel && !hasRemoteType ? (
                        <span className="gjmx-job-type">{typeLabel}</span>
                      ) : null}
                    </div>

                    <div className="gjmx-job-footer">
                      {salary ? (
                        <strong className="gjmx-job-salary">{salary}</strong>
                      ) : (
                        <span className="gjmx-job-salary-placeholder" />
                      )}
                      <Link
                        href={`/jobs/${job.id}`}
                        className="gjmx-job-open"
                        aria-label={`${t("Home.viewJob", "View Job")}: ${job.title}`}
                      >
                        <ArrowRight size={17} className="gjmx-mirror" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="gjmx-jobs-empty" role="status">
                <span className="gjmx-empty-icon" aria-hidden="true">
                  <BriefcaseBusiness size={22} />
                </span>
                <h3>{t("Home.noJobsTitle", "No active jobs to display yet")}</h3>
                <p>
                  {t(
                    "Home.noJobsDescription",
                    "Check the jobs page for the latest opportunities.",
                  )}
                </p>
                <Link href="/jobs" className="gjmx-retry-button">
                  {t("Home.browseJobs", "Browse Jobs")}
                  <ArrowRight size={16} className="gjmx-mirror" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="gjmx-discovery" aria-labelledby="gjmx-discovery-title">
        <div className="gjm-container">
          <div className="gjmx-section-heading gjmx-section-heading--copy">
            <div>
              <p className="gjmx-section-kicker">
                {t("Home.platformKicker", "ONE PLATFORM")}
              </p>
              <h2 id="gjmx-discovery-title" className="gjmx-section-title">
                {t("Home.platformTitle", "Everything around your job search.")}
              </h2>
            </div>
            <p className="gjmx-section-description">
              {t(
                "Home.platformDescription",
                "A focused set of tools and destinations designed to make global job discovery simpler.",
              )}
            </p>
          </div>

          <div className="gjmx-discovery-grid">
            {discoveryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} className="gjmx-discovery-link" key={item.href}>
                  <span className="gjmx-discovery-icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <span className="gjmx-discovery-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="gjmx-discovery-arrow gjmx-mirror"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="gjmx-employer-section" aria-labelledby="gjmx-employer-title">
        <div className="gjm-container">
          <div className="gjmx-employer-card">
            <span className="gjmx-employer-mark" aria-hidden="true">
              <Building2 size={27} />
            </span>
            <div className="gjmx-employer-copy">
              <p className="gjmx-section-kicker">
                {t("Home.employerKicker", "FOR EMPLOYERS")}
              </p>
              <h2 id="gjmx-employer-title">
                {t("Home.employerTitle", "Find talent without borders.")}
              </h2>
              <p>
                {t(
                  "Home.employerDescription",
                  "Publish opportunities, discover candidates and manage hiring from one professional workspace.",
                )}
              </p>
            </div>
            <Link href="/employer/dashboard" className="gjm-btn gjm-btn-primary">
              {t("Home.employerCta", "Explore Employer Tools")}
              <ArrowRight size={18} className="gjmx-mirror" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="gjmx-newsletter-section">
        <div className="gjm-container">
          <Newsletter />
        </div>
      </section>
    </div>
  );
}
