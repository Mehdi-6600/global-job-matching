"use client";

import Link from "next/link";
import { ArrowUpRight, Banknote, MapPin, Sparkles } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { useLocale } from "@/components/locale-provider";
import { salaryLabel, type HomeJob } from "@/lib/home/content";

/**
 * JobCard — the single canonical listing card (home, /jobs, saved jobs).
 *
 * A "stretched link" keeps the whole card clickable while still allowing the
 * required source-attribution link (RemoteOK et al.) to be a real, separate
 * link. Keyboard users get two predictable tab stops instead of a nested
 * interactive tree.
 */
export interface JobCardProps {
  job: HomeJob & {
    attribution?: string | null;
    externalUrl?: string | null;
  };
  featured?: boolean;
  className?: string;
}

export function JobCard({ job, featured = false, className = "" }: JobCardProps) {
  const { t, locale } = useLocale();

  const companyName = job.company?.name || t("Jobs.companyFallback", "Company");
  const salary = salaryLabel(job, locale, t("Jobs.upTo", "Up to"));
  const typeLabel = job.type?.trim();
  const hasRemoteType = typeLabel?.toLowerCase() === "remote";

  return (
    <article
      className={[
        "group relative flex flex-col rounded-[var(--radius-xl)] border bg-[var(--surface)] p-4 sm:p-5",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]",
        "focus-within:ring-2 focus-within:ring-[var(--focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-page)]",
        featured
          ? "border-[var(--warning-soft)]"
          : "border-[var(--border-soft)] hover:border-[var(--border-strong)]",
        className,
      ].join(" ")}
    >
      {featured ? (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--warning)]">
          <Sparkles size={11} aria-hidden="true" />
          {t("Jobs.featured", "Featured")}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <CompanyLogo name={companyName} logo={job.company?.logo} size={44} />

        <div className="min-w-0 flex-1">
          <h3 className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em] text-[var(--text-primary)]">
            <Link
              href={`/jobs/${job.id}`}
              className="line-clamp-2 after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:text-[var(--brand-primary-hover)] focus-visible:outline-none"
            >
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--text-muted)]">
            {companyName}
          </p>
        </div>

        <ArrowUpRight
          size={16}
          aria-hidden="true"
          className="mt-1 shrink-0 text-[var(--text-subtle)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {job.location ? (
          <span className="gjm-chip">
            <MapPin size={12} aria-hidden="true" />
            <span className="max-w-[11rem] truncate">{job.location}</span>
          </span>
        ) : null}

        {job.remote || hasRemoteType ? (
          <span className="gjm-chip gjm-chip--brand">
            {t("Common.remote", "Remote")}
          </span>
        ) : null}

        {typeLabel && !hasRemoteType ? (
          <span className="gjm-chip">{typeLabel}</span>
        ) : null}

        {job.category?.name ? (
          <span className="gjm-chip">{job.category.name}</span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--border-soft)] pt-3.5">
        <span
          className={[
            "tabular inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold",
            salary
              ? "text-[var(--text-primary)]"
              : "font-normal text-[var(--text-subtle)]",
          ].join(" ")}
        >
          {salary ? (
            <Banknote
              size={14}
              aria-hidden="true"
              className="text-[var(--text-subtle)]"
            />
          ) : null}
          {salary || t("Home.salaryNotListed", "Salary not listed")}
        </span>

        {job.createdAt ? (
          <time
            dateTime={job.createdAt}
            className="shrink-0 text-[0.6875rem] text-[var(--text-subtle)]"
          >
            {new Date(job.createdAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
            })}
          </time>
        ) : null}
      </div>

      {job.attribution && job.externalUrl ? (
        <div className="relative z-10 mt-3">
          <a
            href={job.externalUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--text-subtle)] transition-colors hover:text-[var(--brand-primary-hover)]"
          >
            {job.attribution}
            <ArrowUpRight size={11} aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </article>
  );
}
