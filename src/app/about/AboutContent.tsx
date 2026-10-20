"use client";

import Link from "next/link";
import { ArrowRight, Globe2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * About — editorial layout on the Ink & Signal tokens.
 *
 * Every string is an i18n key (About.* / Home.* / Nav.*) so the page localises
 * into all 12 locales and mirrors correctly under `dir="rtl"`. The layout uses
 * logical properties only (ps/pe/ms/me/text-start) and no fixed pixel widths,
 * so it reflows at 375 / 768 / 1280 without horizontal scroll.
 */
export default function AboutContent() {
  const { t } = useLocale();

  const values = [
    {
      icon: Globe2,
      title: t("About.f1Title", "Global listings"),
      desc: t("About.f1Desc", "Jobs from multiple sources in one place."),
    },
    {
      icon: Sparkles,
      title: t("About.f2Title", "AI Tools"),
      desc: t("About.f2Desc", "Resume assistance and career risk insights."),
    },
    {
      icon: ShieldCheck,
      title: t("About.f3Title", "Fair Plans"),
      desc: t("About.f3Desc", "Start free, upgrade when you need."),
    },
    {
      icon: Search,
      title: t("About.f4Title", "Security by Design"),
      desc: t("About.f4Desc", "Auth, quotas and privacy controls."),
    },
  ];

  const facts = [
    {
      value: "12",
      label: t("Home.statLanguages", "Languages"),
      hint: t("Home.trustLanguages", "12 languages"),
    },
    {
      value: t("Home.globalStatValue", "Global"),
      label: t("Home.statCompanies", "Companies"),
      hint: t("Home.trustGlobal", "Global opportunities"),
    },
    {
      value: t("Home.statFreeValue", "Free"),
      label: t("Home.statFreeLabel", "To get started"),
      hint: t("Common.optional", "Optional"),
    },
  ];

  return (
    <div className="pb-4">
      {/* ---------------------------------------------------------------- *
          Masthead — one loud idea, then a readable lead.
         * ---------------------------------------------------------------- */}
      <header className="border-b border-[var(--border-soft)] pb-10 sm:pb-14">
        <p className="gjm-eyebrow mb-4">{t("Nav.about", "About")}</p>

        <h1 className="max-w-[22ch] text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.5rem]">
          {t("About.title", "About Global Job Matching")}
        </h1>

        <p className="mt-5 max-w-[62ch] text-pretty text-lg leading-relaxed text-[var(--text-body)]">
          {t(
            "About.p1",
            "We help people find work across borders with transparent tools and AI assistance.",
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/jobs" className="gjm-btn gjm-btn-primary w-full sm:w-auto">
            {t("About.ctaJobs", "Browse Jobs")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link
            href="/contact"
            className="gjm-btn gjm-btn-secondary w-full sm:w-auto"
          >
            {t("About.ctaContact", "Contact Us")}
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- *
          Mission + values
         * ---------------------------------------------------------------- */}
      <section
        aria-labelledby="about-values"
        className="grid gap-10 py-12 sm:gap-12 lg:grid-cols-12 lg:gap-14 lg:py-16"
      >
        <div className="lg:col-span-5">
          <p className="gjm-eyebrow mb-3">
            {t("Home.whyKicker", "WHY GLOBAL JOB MATCHING")}
          </p>
          <h2
            id="about-values"
            className="max-w-[20ch] text-balance text-2xl font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)] sm:text-3xl"
          >
            {t("Home.whyTitle", "Your career has no borders.")}
          </h2>

          <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
            {t(
              "About.p2",
              "Employers reach global talent; job seekers discover positions that match their skills and goals.",
            )}
          </p>

          {/* Compact proof strip — three facts, no vanity metrics. */}
          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border-soft)]">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="bg-[var(--surface)] px-4 py-4 text-center"
              >
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="block text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {fact.value}
                  </span>
                  <span className="mt-1 block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]">
                    {fact.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {values.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="group relative flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-2)] motion-reduce:hover:translate-y-0"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className="gjm-num text-[0.6875rem] font-semibold tracking-[0.12em] text-[var(--text-subtle)]"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                  {item.desc}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- *
          Closing CTA — ink panel is theme-invariant by design.
         * ---------------------------------------------------------------- */}
      <section className="gjm-ink-panel flex flex-col gap-5 rounded-[var(--radius-xl)] p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f2f6f2] sm:text-2xl">
            {t("Home.whyTitle", "Your career has no borders.")}
          </h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#a8bcb2]">
            {t(
              "Home.whyDescription",
              "Everything you need to discover opportunities, evaluate employers and manage your job search in one focused experience.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <Link href="/jobs" className="gjm-btn gjm-btn-white">
            {t("About.ctaJobs", "Browse Jobs")}
          </Link>
          <Link href="/register" className="gjm-btn gjm-btn-outline-ink">
            {t("Nav.register", "Register")}
          </Link>
        </div>
      </section>
    </div>
  );
}
