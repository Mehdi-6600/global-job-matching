"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Globe,
  Layers,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { JobCard } from "@/components/jobs/job-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonJobCard } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";
import { categoryLabel } from "@/lib/i18n/category-labels";

interface Job {
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
  tags: string[];
  createdAt: string;
  /* Featured boost (crypto one-time payment) */
  featured?: boolean;
  featuredUntil?: string | null;
  /* Ingestion provenance — present for aggregated jobs. */
  source: string | null;
  attribution: string | null;
  externalUrl: string | null;
  applyUrl: string | null;
  company: {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
  } | null;
  category: { name: string; slug: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  count: number;
  /** Precomputed localized labels from /api/categories, keyed by locale. */
  labels?: Record<string, string>;
}

interface Filters {
  search: string;
  location: string;
  type: string;
  experience: string;
  category: string;
  remote: boolean;
  minSalary: string;
  maxSalary: string;
  tag: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  location: "",
  type: "",
  experience: "",
  category: "",
  remote: false,
  minSalary: "",
  maxSalary: "",
  tag: "",
};

const TEXT_DEBOUNCE_MS = 350;

type FetchError = false | "rate_limit" | "generic";

type JobsClientProps = {
  initialJobs?: Job[];
  initialTotalPages?: number;
};

/** Build the /api/jobs query string from the current filter state. */
function buildParams(
  filters: Filters,
  debounced: { search: string; location: string; tag: string },
  page: number,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (debounced.search) params.set("search", debounced.search);
  if (debounced.location) params.set("location", debounced.location);
  if (filters.type) params.set("type", filters.type);
  if (filters.experience) params.set("experience", filters.experience);
  if (filters.category) params.set("category", filters.category);
  if (filters.remote) params.set("remote", "true");
  if (debounced.tag) params.set("tag", debounced.tag);

  const min = parseInt(filters.minSalary, 10);
  const max = parseInt(filters.maxSalary, 10);
  if (Number.isFinite(min) && min >= 0) params.set("minSalary", String(min));
  if (Number.isFinite(max) && max >= 0) params.set("maxSalary", String(max));

  return params;
}

/** Filters encoded in the URL (so home/search links land pre-filtered). */
function filtersFromUrl(): Filters | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const next: Filters = {
    ...EMPTY_FILTERS,
    search: params.get("search") || params.get("q") || "",
    location: params.get("location") || "",
    type: params.get("type") || "",
    experience: params.get("experience") || "",
    category: params.get("category") || "",
    remote: params.get("remote") === "true",
    minSalary: params.get("minSalary") || "",
    maxSalary: params.get("maxSalary") || "",
    tag: params.get("tag") || "",
  };

  const changed = (Object.keys(next) as (keyof Filters)[]).some(
    (key) => next[key] !== EMPTY_FILTERS[key],
  );

  return changed ? next : null;
}

const labelClass =
  "mb-1.5 block text-[0.75rem] font-semibold text-[var(--text-body)]";
const controlClass =
  "h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[0.875rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] transition-colors focus-visible:border-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary-soft)]";

export function JobsClient({
  initialJobs = [],
  initialTotalPages = 1,
}: JobsClientProps) {
  const { t, locale } = useLocale();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedTag, setDebouncedTag] = useState("");

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(initialJobs.length === 0);
  const [fetchError, setFetchError] = useState<FetchError>(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  /* Categories (optional filter) */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/categories", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.categories) ? data.categories : [];
        setCategories(rows);
      })
      .catch(() => {
        /* silent — category filter is optional */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Initialise from ?search=&location=… once on mount. */
  const urlInitRef = useRef(false);
  useEffect(() => {
    if (urlInitRef.current) return;
    urlInitRef.current = true;

    const fromUrl = filtersFromUrl();
    if (!fromUrl) return;

    setFilters(fromUrl);
    setDebouncedSearch(fromUrl.search);
    setDebouncedLocation(fromUrl.location);
    setDebouncedTag(fromUrl.tag);
  }, []);

  /* Debounce free-text fields. */
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(filters.search), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedLocation(filters.location),
      TEXT_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [filters.location]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTag(filters.tag), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.tag]);

  const abortRef = useRef<AbortController | null>(null);
  /** Skip the first client fetch when SSR already provided the default page. */
  const ssrBootRef = useRef(initialJobs.length > 0);

  const fetchJobs = useCallback(async () => {
    if (ssrBootRef.current) {
      ssrBootRef.current = false;
      const hasFilters =
        !!(debouncedSearch || debouncedLocation || debouncedTag) ||
        !!filters.type ||
        !!filters.experience ||
        !!filters.category ||
        filters.remote ||
        !!filters.minSalary ||
        !!filters.maxSalary ||
        page !== 1;
      if (!hasFilters) {
        setLoading(false);
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFetchError(false);

    const params = new URLSearchParams();
    params.set("page", String(page));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedLocation) params.set("location", debouncedLocation);
    if (filters.type) params.set("type", filters.type);
    if (filters.experience) params.set("experience", filters.experience);
    if (filters.category) params.set("category", filters.category);
    if (filters.remote) params.set("remote", "true");
    if (debouncedTag) params.set("tag", debouncedTag);

    const minNum = parseInt(filters.minSalary, 10);
    const maxNum = parseInt(filters.maxSalary, 10);
    if (Number.isFinite(minNum) && minNum >= 0) {
      params.set("minSalary", String(minNum));
    }
    if (Number.isFinite(maxNum) && maxNum >= 0) {
      params.set("maxSalary", String(maxNum));
    }

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (controller.signal.aborted) return;

      if (!res.ok) {
        setJobs([]);
        setFetchError(res.status === 429 ? "rate_limit" : "generic");
        return;
      }

      setJobs(data.jobs || data.data || []);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
      setTotalResults(
        typeof data.pagination?.total === "number"
          ? data.pagination.total
          : Array.isArray(data.jobs)
            ? data.jobs.length
            : null,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setJobs([]);
      setFetchError("generic");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    debouncedLocation,
    debouncedTag,
    filters.type,
    filters.experience,
    filters.category,
    filters.remote,
    filters.minSalary,
    filters.maxSalary,
  ]);

  useEffect(() => {
    void fetchJobs();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchJobs]);

  /* Keep the address bar shareable without triggering navigation. */
  useEffect(() => {
    if (!urlInitRef.current) return;
    const params = buildParams(
      filters,
      { search: debouncedSearch, location: debouncedLocation, tag: debouncedTag },
      page,
    );
    params.delete("page");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [
    filters,
    debouncedSearch,
    debouncedLocation,
    debouncedTag,
    page,
  ]);

  /* Escape closes the mobile filter sheet. */
  useEffect(() => {
    if (!showFilters) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowFilters(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showFilters]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
    setDebouncedLocation("");
    setDebouncedTag("");
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.location) count++;
    if (filters.type) count++;
    if (filters.experience) count++;
    if (filters.category) count++;
    if (filters.remote) count++;
    if (filters.minSalary) count++;
    if (filters.maxSalary) count++;
    if (filters.tag) count++;
    return count;
  }, [filters]);

  const hasFilters = activeFilterCount > 0 || Boolean(filters.search);

  const filterPanel = (
    <div className="space-y-4">
      <div>
        <label htmlFor="jobs-filter-location" className={labelClass}>
          {t("Jobs.location", "Location")}
        </label>
        <div className="relative">
          <MapPin
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            id="jobs-filter-location"
            type="text"
            placeholder={t("Jobs.locationPlaceholder", "City or country...")}
            value={filters.location}
            onChange={(event) => updateFilter("location", event.target.value)}
            className={`${controlClass} ps-9`}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <label htmlFor="jobs-filter-category" className={labelClass}>
            {t("Jobs.category", "Category")}
          </label>
          <select
            id="jobs-filter-category"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            className={controlClass}
          >
            <option value="">{t("Jobs.allCategories", "All Categories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.labels?.[locale] ??
                  categoryLabel(category.slug, category.name, locale)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="jobs-filter-type" className={labelClass}>
          {t("Jobs.jobType", "Job Type")}
        </label>
        <select
          id="jobs-filter-type"
          value={filters.type}
          onChange={(event) => updateFilter("type", event.target.value)}
          className={controlClass}
        >
          <option value="">{t("Jobs.allTypes", "All Types")}</option>
          <option value="full-time">{t("Jobs.types.fullTime", "Full-time")}</option>
          <option value="part-time">{t("Jobs.types.partTime", "Part-time")}</option>
          <option value="contract">{t("Jobs.types.contract", "Contract")}</option>
          <option value="freelance">{t("Jobs.types.freelance", "Freelance")}</option>
          <option value="internship">
            {t("Jobs.types.internship", "Internship")}
          </option>
        </select>
      </div>

      <div>
        <label htmlFor="jobs-filter-experience" className={labelClass}>
          {t("Jobs.experience", "Experience")}
        </label>
        <select
          id="jobs-filter-experience"
          value={filters.experience}
          onChange={(event) => updateFilter("experience", event.target.value)}
          className={controlClass}
        >
          <option value="">{t("Jobs.anyExperience", "Any Experience")}</option>
          <option value="entry">{t("Jobs.experienceLevels.entry", "Entry Level")}</option>
          <option value="mid">{t("Jobs.experienceLevels.mid", "Mid Level")}</option>
          <option value="senior">
            {t("Jobs.experienceLevels.senior", "Senior Level")}
          </option>
          <option value="lead">{t("Jobs.experienceLevels.lead", "Lead / Manager")}</option>
          <option value="executive">
            {t("Jobs.experienceLevels.executive", "Executive")}
          </option>
        </select>
      </div>

      <div>
        <label htmlFor="jobs-filter-tag" className={labelClass}>
          {t("Jobs.tag", "Tag")}
        </label>
        <input
          id="jobs-filter-tag"
          type="text"
          placeholder={t("Jobs.tagPlaceholder", "e.g. React, Python...")}
          value={filters.tag}
          onChange={(event) => updateFilter("tag", event.target.value)}
          className={controlClass}
        />
      </div>

      <div>
        <span className={labelClass}>{t("Jobs.minSalary", "Min Salary")}</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            id="jobs-filter-minsalary"
            aria-label={t("Jobs.minSalary", "Min Salary")}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t("Jobs.noLimit", "No limit")}
            value={filters.minSalary}
            onChange={(event) => updateFilter("minSalary", event.target.value)}
            className={controlClass}
          />
          <input
            id="jobs-filter-maxsalary"
            aria-label={t("Jobs.maxSalary", "Max Salary")}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t("Jobs.noLimit", "No limit")}
            value={filters.maxSalary}
            onChange={(event) => updateFilter("maxSalary", event.target.value)}
            className={controlClass}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-2.5">
        <input
          type="checkbox"
          checked={filters.remote}
          onChange={(event) => updateFilter("remote", event.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--brand-primary)]"
        />
        <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-body)]">
          <Globe size={14} aria-hidden="true" />
          {t("Jobs.remoteOnly", "Remote Only")}
        </span>
      </label>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-[0.8125rem] font-semibold text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <X size={14} aria-hidden="true" />
          {t("Jobs.clearAll", "Clear All")}
        </button>
      )}
    </div>
  );

  return (
    <div className="gjm-page">
      <div className="gjm-container">
        <PageHeader
          kicker={t("Jobs.kicker", "GLOBAL CAREERS")}
          title={t("Jobs.title", "Find Your Dream Job")}
          description={t(
            "Jobs.subtitle",
            "Search among thousands of opportunities",
          )}
        />

        {/* Search bar */}
        <div className="mb-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-1)]">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
              />
              <label htmlFor="jobs-search" className="sr-only">
                {t("Jobs.searchPlaceholder", "Job title, keywords, or company...")}
              </label>
              <input
                id="jobs-search"
                type="search"
                placeholder={t(
                  "Jobs.searchPlaceholder",
                  "Job title, keywords, or company...",
                )}
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-transparent ps-9 pe-3 text-[0.9375rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--border)] focus-visible:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(true)}
              aria-expanded={showFilters}
              aria-controls="jobs-filter-sheet"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-[0.875rem] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] lg:hidden"
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              {t("Jobs.filters", "Filters")}
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-[var(--text-on-brand)]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start">
          {/* Desktop filter rail */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                  <Filter size={14} aria-hidden="true" />
                  {t("Jobs.filters", "Filters")}
                </h2>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] px-1 text-[10px] font-bold text-[var(--brand-primary-hover)]">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {filterPanel}
            </div>
          </aside>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p
                className="text-[0.8125rem] text-[var(--text-muted)]"
                aria-live="polite"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    {t("Common.loading", "Loading...")}
                  </span>
                ) : totalResults != null && !fetchError ? (
                  t("Jobs.resultsCount", "{count} jobs").replace(
                    "{count}",
                    totalResults.toLocaleString(locale),
                  )
                ) : null}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[var(--brand-primary-hover)] hover:underline"
                >
                  <X size={13} aria-hidden="true" />
                  {t("Jobs.clearAll", "Clear All")}
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonJobCard key={index} />
                ))}
              </div>
            ) : fetchError ? (
              <EmptyState
                icon={<AlertCircle size={22} />}
                title={
                  fetchError === "rate_limit"
                    ? t("Jobs.rateLimitTitle", "Too many requests")
                    : t("Jobs.loadErrorTitle", "Could not load jobs")
                }
                description={
                  fetchError === "rate_limit"
                    ? t(
                        "Jobs.rateLimitBody",
                        "Please wait a moment before trying again.",
                      )
                    : t(
                        "Jobs.loadErrorBody",
                        "Something went wrong. Please try again.",
                      )
                }
                action={
                  <button
                    type="button"
                    onClick={() => void fetchJobs()}
                    className="gjm-btn gjm-btn-primary"
                  >
                    {t("Common.retry", "Retry")}
                  </button>
                }
              />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={<Layers size={22} />}
                title={t("Jobs.noJobsFound", "No jobs found")}
                description={t(
                  "Jobs.tryAdjusting",
                  "Try adjusting your search or filters",
                )}
                action={
                  hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="gjm-btn gjm-btn-secondary"
                    >
                      {t("Jobs.clearAll", "Clear All")}
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      featured={job.featured}
                      job={{
                        id: job.id,
                        title: job.title,
                        location: job.location,
                        remote: job.remote,
                        type: job.type,
                        salaryMin: job.salaryMin,
                        salaryMax: job.salaryMax,
                        currency: job.currency,
                        createdAt: job.createdAt,
                        company: job.company,
                        category: job.category,
                        attribution: job.attribution,
                        externalUrl: job.externalUrl,
                      }}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-7 flex items-center justify-center gap-3"
                    aria-label={t("Jobs.pagination", "Pagination")}
                  >
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      aria-label={t("Jobs.previousPage", "Previous page")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                    >
                      <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden="true" />
                    </button>

                    <span className="tabular text-[0.8125rem] text-[var(--text-muted)]">
                      {t("Jobs.pageOf", "Page {current} of {total}")
                        .split("{current}")
                        .join(String(page))
                        .split("{total}")
                        .join(String(totalPages))}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      disabled={page === totalPages}
                      aria-label={t("Jobs.nextPage", "Next page")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                    >
                      <ChevronRight size={18} className="rtl:rotate-180" aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label={t("Common.close", "Close")}
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div
            id="jobs-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("Jobs.filters", "Filters")}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-5 pb-8 shadow-[var(--shadow-5)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t("Jobs.filters", "Filters")}
              </h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="gjm-icon-btn"
                aria-label={t("Common.close", "Close")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {filterPanel}

            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="gjm-btn gjm-btn-primary mt-4 w-full"
            >
              {t("Jobs.showResults", "Show results")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobsClient;
