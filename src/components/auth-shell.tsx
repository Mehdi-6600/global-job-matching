"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, Sparkles, Globe2 } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import { useLocale } from "@/components/locale-provider";

/**
 * Split-screen auth shell: marketing panel (ink) + form card (paper).
 * Used by /login and /register so both pages share one visual language.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useLocale();

  const points = [
    {
      icon: <Globe2 size={16} />,
      text: t(
        "Auth.sidePoint1",
        "Global roles from vetted employers, updated daily.",
      ),
    },
    {
      icon: <Sparkles size={16} />,
      text: t(
        "Auth.sidePoint2",
        "AI match scores, resume help and career-risk insights.",
      ),
    },
    {
      icon: <BadgeCheck size={16} />,
      text: t(
        "Auth.sidePoint3",
        "Transparent salaries and one profile for every application.",
      ),
    },
  ];

  return (
    <div className="gjm-page">
      <div className="gjm-container">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-stretch">
          {/* Marketing panel */}
          <aside className="gjm-ink-panel hidden flex-col justify-between p-8 lg:flex">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2.5"
                aria-label="Global Job Matching"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.06)] p-0.5"
                >
                  <BrandMark size={30} />
                </span>
                <span className="flex flex-col leading-none">
                  <strong className="text-[0.8125rem] font-bold tracking-[0.06em] text-white">
                    GLOBAL JOB
                  </strong>
                  <span className="text-[0.625rem] font-semibold tracking-[0.22em] text-[#8fb3a4]">
                    MATCHING
                  </span>
                </span>
              </Link>

              <h2 className="mt-10 max-w-sm text-[clamp(1.75rem,2.4vw,2.375rem)] font-[650] leading-[1.1] tracking-[-0.035em]">
                {t("Auth.sideTitle", "Your next role starts with a better search.")}
              </h2>

              <ul className="mt-7 space-y-3.5">
                {points.map((point) => (
                  <li key={point.text} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(126,240,196,0.14)] text-[#7ef0c4]"
                    >
                      {point.icon}
                    </span>
                    <span className="text-[0.875rem] leading-relaxed">
                      {point.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-10 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#7ef0c4]">
              {t("Auth.sideFooter", "Free to join. No credit card required.")}
            </p>
          </aside>

          {/* Form card */}
          <section className="rounded-[var(--radius-2xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-2)] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={15} aria-hidden="true" className="rtl:rotate-180" />
                {t("Nav.home", "Home")}
              </Link>

              <span className="lg:hidden" aria-hidden="true">
                <BrandMark size={28} />
              </span>
            </div>

            <h1 className="text-[1.625rem] font-[650] tracking-[-0.03em] text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-6">{children}</div>

            {footer ? (
              <div className="mt-6 border-t border-[var(--border-soft)] pt-5 text-center text-sm text-[var(--text-muted)]">
                {footer}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
