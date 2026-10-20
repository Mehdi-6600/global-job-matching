"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
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
import { categoryLabel } from "@/lib/i18n/category-labels";
import {
  salaryLabel,
  splitHeroTitle,
  type HomeJob,
  type JobsResponse,
} from "@/lib/home/content";
import { JobCard } from "@/components/jobs/job-card";
import { CompanyLogo } from "@/components/company-logo";
import Newsletter from "./components/Newsletter";
import FeaturedUrgencyBanner from "@/components/featured-urgency-banner";

type Audience = "seeker" | "employer";

const HOME_JOB_LIMIT = 3;

const FEATURED_CATEGORIES = [
  "software-engineering",
  "design",
  "marketing",
  "sales",
] as const;

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

        if (!response.ok) throw new Error("Failed to load jobs");

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
    if (audience === "employer") {
      router.push("/employer/post-job");
      return;
    }

    const query = params.toString();
    router.push(`/jobs${query ? `?${query}` : ""}`);
  }

  const primaryHref = audience === "seeker" ? "/jobs" : "/employer/dashboard";
  const primaryLabel =
    audience === "seeker"
      ? t("Home.ctaJobs", "Find Jobs")
      : t("Home.employerCta", "Explore Employer Tools");

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

  const liveJobs = jobs.slice(0, 2);

  return (
    <div className="overflow-x-clip">
      {/* ================= HERO ================= */}
      <section className="relative border-b border-[var(--border-soft)]">
        <div
          aria-hidden="true"
          className="gjm-grid-bg pointer-events-none absolute inset-0 opacity-40"
        />
        <div className="gjm-container relative py-10 sm:py-14 lg:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14">
            <div>
              <div
                className="inline-flex rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--surface)] p-1"
                role="group"
                aria-label={t("Home.audienceLabel", "Choose your audience")}
              >
                {(
                  [
                    ["seeker", t("Home.audienceSeeker", "For Job Seekers")],
                    ["employer", t("Home.audienceEmployer", "For Employers")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={audience === value}
                    onClick={() => setAudience(value)}
                    className={[
                      "rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[0.75rem] font-semibold transition-colors",
                      audience === value
                        ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="gjm-eyebrow mt-6">
                <Globe2 size={13} aria-hidden="true" />
                {t("Home.eyebrow", "GLOBAL CAREER PLATFORM")}
              </p>

              <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-[650] leading-[1.04] tracking-[-0.04em] text-[var(--text-primary)]">
                <span className="block">{heroTitle.line1}</span>
                {heroTitle.line2 ? (
                  <span className="mt-1 block text-[var(--brand-primary)]">
                    {heroTitle.line2}
                  </span>
                ) : null}
              </h1>

              <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--text-body)]">
                {t(
                  "Home.subtitle",
                  "Discover global jobs, connect with employers, and move your career forward without borders.",
                )}
              </p>

              {/* Search */}
              <form
                onSubmit={submitSearch}
                role="search"
                className="mt-7 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-2)]"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search
                      size={17}
                      aria-hidden="true"
                      className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
                    />
                    <label htmlFor="home-keyword" className="sr-only">
                      {t("Home.searchKeywordLabel", "What are you looking for?")}
                    </label>
                    <input
                      id="home-keyword"
                      name="search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t(
                        "Home.searchKeywordPlaceholder",
                        "Job title, skill or company",
                      )}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-transparent ps-9 pe-3 text-[0.9375rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--border)] focus-visible:outline-none"
                    />
                  </div>

                  <span
                    aria-hidden="true"
                    className="hidden h-7 w-px bg-[var(--border-soft)] md:block"
                  />

                  <div className="relative flex-1">
                    <MapPin
                      size={17}
                      aria-hidden="true"
                      className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
                    />
                    <label htmlFor="home-location" className="sr-only">
                      {t("Home.searchLocationLabel", "Where?")}
                    </label>
                    <input
                      id="home-location"
                      name="location"
                      type="search"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder={t(
                        "Home.searchLocationPlaceholder",
                        "Country, city or remote",
                      )}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-transparent ps-9 pe-3 text-[0.9375rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--border)] focus-visible:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-action)] px-5 text-[0.9375rem] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-action-hover)]"
                  >
                    <Search size={16} aria-hidden="true" />
                    {t("Home.searchButton", "Search Jobs")}
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="me-1 text-[0.75rem] font-medium text-[var(--text-subtle)]">
                  {t("Home.popularSearches", "Popular")}
                </span>
                {FEATURED_CATEGORIES.map((slug) => (
                  <Link
                    key={slug}
                    href={`/jobs?category=${slug}`}
                    className="gjm-chip transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  >
                    {categoryLabel(slug, slug, locale)}
                  </Link>
                ))}
                <Link
                  href="/jobs?remote=true"
                  className="gjm-chip gjm-chip--brand transition-opacity hover:opacity-85"
                >
                  {t("Common.remote", "Remote")}
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={primaryHref} className="gjm-btn gjm-btn-primary">
                  {primaryLabel}
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="rtl:rotate-180"
                  />
                </Link>
                <Link href="/register" className="gjm-btn gjm-btn-secondary">
                  {t("Home.ctaRegister", "Create Your Profile")}
                </Link>
              </div>
            </div>

            {/* Live board */}
            <aside className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-2)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--text-primary)]">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                  </span>
                  {t("Home.dashboardLive", "Live board")}
                </span>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[var(--brand-primary-hover)] hover:underline"
                >
                  {t("Home.viewAllJobs", "View all jobs")}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              </div>

              {loadingJobs ? (
                <div className="mt-4 space-y-3" aria-busy="true">
                  {[0, 1].map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] p-3"
                    >
                      <span className="h-9 w-9 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-2)]" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
                        <span className="block h-2.5 w-1/2 animate-pulse rounded bg-[var(--surface-2)]" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : liveJobs.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {liveJobs.map((job) => {
                    const salary = salaryLabel(
                      job,
                      locale,
                      t("Jobs.upTo", "Up to"),
                    );
                    return (
                      <li key={job.id}>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                        >
                          <CompanyLogo
                            name={job.company?.name || "GJ"}
                            logo={job.company?.logo}
                            size={38}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary-hover)]">
                              {job.title}
                            </span>
                            <span className="block truncate text-[0.75rem] text-[var(--text-muted)]">
                              {job.company?.name ||
                                t("Home.globalCompany", "Global company")}
                              {salary ? ` · ${salary}` : ""}
                            </span>
                          </span>
                          <ArrowUpRight
                            size={14}
                            aria-hidden="true"
                            className="shrink-0 text-[var(--text-subtle)]"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-4 text-[0.8125rem] text-[var(--text-muted)]">
                  {t(
                    "Home.noJobsDescription",
                    "Check the jobs page for the latest opportunities.",
                  )}
                </p>
              )}

              {jobsError ? (
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="mt-3 text-[0.75rem] font-semibold text-[var(--brand-primary-hover)] hover:underline"
                >
                  {t("Common.retry", "Try again")}
                </button>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border-soft)] pt-4">
                <div>
                  <p className="tabular text-[1.375rem] font-[650] leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                    {totalJobs == null
                      ? "—"
                      : totalJobs.toLocaleString(locale)}
                  </p>
                  <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-[var(--text-subtle)]">
                    {t("Home.activeJobs", "active jobs")}
                  </p>
                </div>
                <div>
                  <p className="tabular text-[1.375rem] font-[650] leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                    {locales.length}
                  </p>
                  <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-[0.09em] text-[var(--text-subtle)]">
                    {t("Home.trustLanguagesLabel", "Languages")}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ================= URGENCY ================= */}
      <div className="gjm-container pt-6">
        <FeaturedUrgencyBanner />
      </div>

      {/* ================= TRENDING JOBS ================= */}
      <section
        className="gjm-container py-10 sm:py-14"
        aria-labelledby="home-jobs-title"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="gjm-eyebrow">
              {t("Home.trendingKicker", "LATEST OPPORTUNITIES")}
            </p>
            <h2
              id="home-jobs-title"
              className="mt-2 text-[clamp(1.5rem,2vw+1rem,2.125rem)] font-[650] tracking-[-0.03em] text-[var(--text-primary)]"
            >
              {t("Home.trendingTitle", "Trending opportunities")}
            </h2>
          </div>

          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary-hover)] hover:underline"
          >
            {t("Home.viewAllJobs", "View all jobs")}
            <ArrowRight size={15} aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        </div>

        {loadingJobs ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: HOME_JOB_LIMIT }).map((_, index) => (
              <div
                key={index}
                className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3.5 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
                    <span className="block h-2.5 w-1/2 animate-pulse rounded bg-[var(--surface-2)]" />
                  </span>
                </div>
                <div className="mt-4 h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : jobsError ? (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-2)] text-[var(--text-muted)]">
              <BriefcaseBusiness size={22} aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {t("Jobs.loadErrorTitle", "Could not load jobs")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t("Jobs.loadErrorBody", "Something went wrong. Please try again.")}
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="gjm-btn gjm-btn-secondary mt-4"
            >
              {t("Common.retry", "Try again")}
            </button>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-2)] text-[var(--text-muted)]">
              <BriefcaseBusiness size={22} aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {t("Home.noJobsTitle", "No active jobs to display yet")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t(
                "Home.noJobsDescription",
                "Check the jobs page for the latest opportunities.",
              )}
            </p>
            <Link href="/jobs" className="gjm-btn gjm-btn-secondary mt-4">
              {t("Home.browseJobs", "Browse Jobs")}
            </Link>
          </div>
        )}
      </section>

      {/* ================= PLATFORM ================= */}
      <section
        className="border-y border-[var(--border-soft)] bg-[var(--surface)] py-10 sm:py-14"
        aria-labelledby="home-platform-title"
      >
        <div className="gjm-container">
          <div className="mb-7 max-w-2xl">
            <p className="gjm-eyebrow">
              {t("Home.platformKicker", "ONE PLATFORM")}
            </p>
            <h2
              id="home-platform-title"
              className="mt-2 text-[clamp(1.5rem,2vw+1rem,2.125rem)] font-[650] tracking-[-0.03em] text-[var(--text-primary)]"
            >
              {t("Home.platformTitle", "Everything around your job search.")}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
              {t(
                "Home.platformDescription",
                "A focused set of tools and destinations designed to make global job discovery simpler.",
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discoveryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--bg-page)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-primary-tint)] text-[var(--brand-primary-hover)]"
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </strong>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= EMPLOYERS ================= */}
      <section className="gjm-container py-10 sm:py-14">
        <div className="gjm-ink-panel px-6 py-8 sm:px-10 sm:py-10">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="gjm-eyebrow">
                {t("Home.employerKicker", "FOR EMPLOYERS")}
              </p>
              <h2 className="mt-2 text-[clamp(1.5rem,2.2vw+1rem,2.25rem)] font-[650] tracking-[-0.03em]">
                {t("Home.employerTitle", "Find talent without borders.")}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed">
                {t(
                  "Home.employerDescription",
                  "Publish opportunities, discover candidates and manage hiring from one professional workspace.",
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/employer/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[#7ef0c4] px-5 text-[0.9375rem] font-semibold text-[#04120c] transition-transform hover:-translate-y-0.5"
              >
                {t("Home.employerCta", "Explore Employer Tools")}
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="rtl:rotate-180"
                />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.25)] px-5 text-[0.9375rem] font-semibold text-[#eef4f0] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
              >
                {t("Nav.pricing", "Pricing")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= NEWSLETTER ================= */}
      <section className="gjm-container pb-14 sm:pb-20">
        <Newsletter />
      </section>
    </div>
  );
}
