"use client";

import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";

const columnTitle =
  "mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--text-subtle)]";
const columnLink =
  "block py-1.5 text-sm text-[var(--text-body)] transition-colors hover:text-[var(--brand-primary-hover)]";

export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="gjm-footer">
      <div className="gjm-container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5"
              aria-label="Global Job Matching"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-2)] p-1"
              >
                <BrandMark size={32} />
              </span>
              <span className="flex flex-col leading-none">
                <strong className="text-[0.875rem] font-bold tracking-[0.06em] text-[var(--text-primary)]">
                  GLOBAL JOB
                </strong>
                <span className="text-[0.6875rem] font-semibold tracking-[0.22em] text-[var(--text-subtle)]">
                  MATCHING
                </span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
              {t(
                "Footer.tagline",
                "Global opportunities, connected careers and a clearer way to find your next move.",
              )}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-2)] px-2.5 py-1.5">
              <Globe2
                size={14}
                aria-hidden="true"
                className="text-[var(--text-subtle)]"
              />
              <LanguageSwitcher />
            </div>
          </div>

          <div>
            <h3 className={columnTitle}>{t("Footer.explore", "Explore")}</h3>
            <Link href="/jobs" className={columnLink}>
              {t("Nav.jobs", "Jobs")}
            </Link>
            <Link href="/companies" className={columnLink}>
              {t("Nav.companies", "Companies")}
            </Link>
            <Link href="/locations" className={columnLink}>
              {t("Nav.locations", "Locations")}
            </Link>
            <Link href="/categories" className={columnLink}>
              {t("Nav.categories", "Categories")}
            </Link>
            <Link href="/blog" className={columnLink}>
              {t("Nav.blog", "Blog")}
            </Link>
          </div>

          <div>
            <h3 className={columnTitle}>{t("Footer.tools", "AI Tools")}</h3>
            <Link href="/career-risk" className={columnLink}>
              {t("CareerRisk.title", "AI Career Risk")}
            </Link>
            <Link href="/resume-builder" className={columnLink}>
              {t("Resume.title", "Resume Builder")}
            </Link>
            <Link href="/job-alerts" className={columnLink}>
              {t("Footer.jobAlerts", "Job Alerts")}
            </Link>
            <Link href="/saved-jobs" className={columnLink}>
              {t("Footer.savedJobs", "Saved Jobs")}
            </Link>
          </div>

          <div>
            <h3 className={columnTitle}>
              {t("Footer.forEmployers", "For Employers")}
            </h3>
            <Link href="/employer/dashboard" className={columnLink}>
              {t("Footer.employerDashboard", "Employer Dashboard")}
            </Link>
            <Link href="/employer/post-job" className={columnLink}>
              {t("Footer.postJob", "Post a Job")}
            </Link>
            <Link href="/pricing" className={columnLink}>
              {t("Nav.pricing", "Pricing")}
            </Link>
            <Link href="/about" className={columnLink}>
              {t("Nav.about", "About")}
            </Link>
            <Link href="/contact" className={columnLink}>
              {t("Nav.contact", "Contact")}
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border-soft)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text-subtle)]">
            © {year} Global Job Matching.{" "}
            {t("Footer.rights", "All rights reserved.")}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/terms"
              className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t("Footer.terms", "Terms of Service")}
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              {t("Footer.privacy", "Privacy Policy")}
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary-hover)] hover:underline"
            >
              {t("Footer.browseJobs", "Browse jobs")}
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
