"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  DollarSign,
  Filter,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Globe,
  Tag,
  AlertCircle,
  Layers,
  ExternalLink,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
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
  // Ingestion provenance — present for aggregated jobs (RemoteOK, Jobicy,
  // Arbeitnow, ...), null for employer-posted jobs.
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
  /** Precomputed localized labels from /api/categories, keyed by locale code. */
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

export function JobsClient({ initialJobs = [], initialTotalPages = 1 }: JobsClientProps) {
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
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, TEXT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedLocation(filters.location);
    }, TEXT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.location]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedTag(filters.tag);
    }, TEXT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.tag]);

  const abortRef = useRef<AbortController | null>(null);
  /** Skip the first client fetch when SSR already provided the default page. */
  const ssrBootRef = useRef(initialJobs.length > 0);


  const fetchJobs = useCallback(async () => {
    // First paint already has SSR jobs; avoid wiping them with a loading spinner.
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
    params.set("page", page.toString());

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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setJobs([]);
      setFetchError("generic");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
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

  const hasFilters = Boolean(
    filters.search ||
      filters.location ||
      filters.type ||
      filters.experience ||
      filters.category ||
      filters.remote ||
      filters.minSalary ||
      filters.maxSalary ||
      filters.tag,
  );

  const formatSalary = useCallback(
    (
      currency: string | null | undefined,
      min: number | null | undefined,
      max: number | null | undefined,
    ) => {
      const cur = currency || "USD";
      if (min == null && max == null) {
        return t(
          "Jobs.salaryNA",
          t("JobDetail.salaryNA", "Salary not specified"),
        );
      }
      if (min != null && max != null) {
        return `${cur} ${min.toLocaleString(locale)} – ${max.toLocaleString(locale)}`;
      }
      if (min != null) {
        return `${t("Jobs.from", "From")} ${cur} ${min.toLocaleString(locale)}`;
      }
      return `${t("Jobs.upTo", "Up to")} ${cur} ${Number(max).toLocaleString(locale)}`;
    },
    [t, locale],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {t("Jobs.title", "Find Your Dream Job")}
          </h1>
          <p className="text-slate-400">
            {t("Jobs.subtitle", "Search among thousands of opportunities")}
          </p>
        </div>

        <div className="glass rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder={t(
                  "Jobs.searchPlaceholder",
                  "Job title, keywords, or company...",
                )}
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters || hasFilters
                  ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Filter className="w-4 h-4" />
              {t("Jobs.filters", "Filters")}
              {hasFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="jobs-filter-location"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.location", "Location")}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="jobs-filter-location"
                    type="text"
                    placeholder={t(
                      "Jobs.locationPlaceholder",
                      "City or country...",
                    )}
                    value={filters.location}
                    onChange={(e) => updateFilter("location", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <label
                    htmlFor="jobs-filter-category"
                    className="block text-xs font-medium text-slate-400 mb-1.5"
                  >
                    {t("Jobs.category", "Category")}
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <select
                      id="jobs-filter-category"
                      value={filters.category}
                      onChange={(e) =>
                        updateFilter("category", e.target.value)
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">
                        {t("Jobs.allCategories", "All Categories")}
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.labels?.[locale] ??
                            categoryLabel(c.slug, c.name, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="jobs-filter-type"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.jobType", "Job Type")}
                </label>
                <select
                  id="jobs-filter-type"
                  value={filters.type}
                  onChange={(e) => updateFilter("type", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">{t("Jobs.allTypes", "All Types")}</option>
                  <option value="full-time">
                    {t("Jobs.types.fullTime", "Full-time")}
                  </option>
                  <option value="part-time">
                    {t("Jobs.types.partTime", "Part-time")}
                  </option>
                  <option value="contract">
                    {t("Jobs.types.contract", "Contract")}
                  </option>
                  <option value="freelance">
                    {t("Jobs.types.freelance", "Freelance")}
                  </option>
                  <option value="internship">
                    {t("Jobs.types.internship", "Internship")}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="jobs-filter-experience"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.experience", "Experience")}
                </label>
                <select
                  id="jobs-filter-experience"
                  value={filters.experience}
                  onChange={(e) => updateFilter("experience", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">
                    {t("Jobs.anyExperience", "Any Experience")}
                  </option>
                  <option value="entry">
                    {t("Jobs.experienceLevels.entry", "Entry Level")}
                  </option>
                  <option value="mid">
                    {t("Jobs.experienceLevels.mid", "Mid Level")}
                  </option>
                  <option value="senior">
                    {t("Jobs.experienceLevels.senior", "Senior Level")}
                  </option>
                  <option value="lead">
                    {t("Jobs.experienceLevels.lead", "Lead / Manager")}
                  </option>
                  <option value="executive">
                    {t("Jobs.experienceLevels.executive", "Executive")}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="jobs-filter-tag"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.tag", "Tag")}
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="jobs-filter-tag"
                    type="text"
                    placeholder={t(
                      "Jobs.tagPlaceholder",
                      "e.g. React, Python...",
                    )}
                    value={filters.tag}
                    onChange={(e) => updateFilter("tag", e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="jobs-filter-minsalary"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.minSalary", "Min Salary")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="jobs-filter-minsalary"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder={t("Jobs.noLimit", "No limit")}
                    value={filters.minSalary}
                    onChange={(e) =>
                      updateFilter("minSalary", e.target.value)
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="jobs-filter-maxsalary"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  {t("Jobs.maxSalary", "Max Salary")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="jobs-filter-maxsalary"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder={t("Jobs.noLimit", "No limit")}
                    value={filters.maxSalary}
                    onChange={(e) =>
                      updateFilter("maxSalary", e.target.value)
                    }
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all w-full">
                  <input
                    type="checkbox"
                    checked={filters.remote}
                    onChange={(e) => updateFilter("remote", e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {t("Jobs.remoteOnly", "Remote Only")}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium w-full justify-center"
                >
                  <X className="w-4 h-4" />
                  {t("Jobs.clearAll", "Clear All")}
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 glass rounded-2xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {fetchError === "rate_limit"
                ? t("Jobs.rateLimitTitle", "Too many requests")
                : t("Jobs.loadErrorTitle", "Could not load jobs")}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {fetchError === "rate_limit"
                ? t(
                    "Jobs.rateLimitBody",
                    "Please wait a moment before trying again.",
                  )
                : t(
                    "Jobs.loadErrorBody",
                    "Something went wrong. Please try again.",
                  )}
            </p>
            <button
              type="button"
              onClick={() => void fetchJobs()}
              className="inline-flex px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              {t("Common.retry", "Retry")}
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-white/10">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("Jobs.noJobsFound", "No jobs found")}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {t(
                "Jobs.tryAdjusting",
                "Try adjusting your search or filters",
              )}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-indigo-400 text-sm hover:underline"
              >
                {t("Jobs.clearAll", "Clear All")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="glass rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 transition-all block"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <CompanyLogo
                      name={
                        job.company?.name ||
                        t("Jobs.companyFallback", "Company")
                      }
                      logo={job.company?.logo}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-white line-clamp-2">
                        {job.title}
                      </h2>
                      <p className="text-sm text-slate-400 truncate">
                        {job.company?.name ||
                          t("Jobs.companyFallback", "Company")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-3">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                    )}
                    {job.remote && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300">
                        <Globe className="w-3 h-3" />
                        {t("Common.remote", "Remote")}
                      </span>
                    )}
                    {job.category?.slug && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5">
                        <Layers className="w-3 h-3" />
                        {categoryLabel(
                          job.category.slug,
                          job.category.name,
                          locale,
                        )}
                      </span>
                    )}
                    {job.type && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5">
                        {job.type}
                      </span>
                    )}
                    {job.experience && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5">
                        {job.experience}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-slate-300">
                      {formatSalary(
                        job.currency,
                        job.salaryMin,
                        job.salaryMax,
                      )}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(job.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>

                  {job.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Source attribution for aggregated jobs (RemoteOK, Jobicy, ...).
                      RemoteOK's API ToS requires a follow link (no rel="nofollow")
                      and naming the source. */}
                  {job.attribution && job.externalUrl && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <a
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {job.attribution}
                      </a>
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label={t("Jobs.previousPage", "Previous page")}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-400 px-4">
                  {t("Jobs.pageOf", "Page {current} of {total}")
                    .split("{current}")
                    .join(String(page))
                    .split("{total}")
                    .join(String(totalPages))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  aria-label={t("Jobs.nextPage", "Next page")}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
