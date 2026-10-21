"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";

export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="gjm-footer">
      <div className="gjm-container">
        <div className="gjm-footer-top">
          <div className="gjm-footer-brand">
            <Link href="/" className="gjm-footer-logo">
              <span className="gjm-footer-symbol">
                <BrandMark size={36} />
              </span>

              <span>
                <strong>GLOBAL JOB</strong>
                <span>MATCHING</span>
              </span>
            </Link>

            <p>
              {t(
                "Footer.tagline",
                "Global opportunities, connected careers and a clearer way to find your next move."
              )}
            </p>

            <div className="gjm-footer-language">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="gjm-footer-column">
            <h3>{t("Footer.explore", "Explore")}</h3>

            <Link href="/jobs">
              {t("Nav.jobs", "Jobs")}
            </Link>

            <Link href="/companies">
              {t("Nav.companies", "Companies")}
            </Link>

            <Link href="/locations">
              {t("Nav.locations", "Locations")}
            </Link>

            <Link href="/categories">
              {t("Nav.categories", "Categories")}
            </Link>

            <Link href="/blog">
              {t("Nav.blog", "Blog")}
            </Link>
          </div>

          <div className="gjm-footer-column">
            <h3>{t("Footer.tools", "AI Tools")}</h3>

            <Link href="/career-risk">
              {t("CareerRisk.title", "AI Career Risk")}
            </Link>

            <Link href="/resume-builder">
              {t("Resume.title", "Resume Builder")}
            </Link>

            <Link href="/job-alerts">
              {t("Footer.jobAlerts", "Job Alerts")}
            </Link>

            <Link href="/saved-jobs">
              {t("Footer.savedJobs", "Saved Jobs")}
            </Link>
          </div>

          <div className="gjm-footer-column">
            <h3>{t("Footer.forEmployers", "For Employers")}</h3>

            <Link href="/employer/dashboard">
              {t("Footer.employerDashboard", "Employer Dashboard")}
            </Link>

            <Link href="/employer/post-job">
              {t("Footer.postJob", "Post a Job")}
            </Link>

            <Link href="/pricing">
              {t("Nav.pricing", "Pricing")}
            </Link>

            <Link href="/about">
              {t("Nav.about", "About")}
            </Link>

            <Link href="/contact">
              {t("Nav.contact", "Contact")}
            </Link>
          </div>
        </div>

        <div className="gjm-footer-divider" />

        <div className="gjm-footer-bottom">
          <p>
            © {year} Global Job Matching.{" "}
            {t("Footer.rights", "All rights reserved.")}
          </p>

          <div className="gjm-footer-bottom-links">
            <Link href="/terms">
              {t("Footer.terms", "Terms of Service")}
            </Link>

            <Link href="/privacy">
              {t("Footer.privacy", "Privacy Policy")}
            </Link>

            <Link href="/jobs">
              {t("Footer.browseJobs", "Browse jobs")}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
