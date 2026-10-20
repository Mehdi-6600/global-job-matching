"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export default function TermsPage() {
  const { t } = useLocale();

  const sections = [
    { title: "Terms.s1Title", body: "Terms.s1Body" },
    { title: "Terms.s2Title", body: "Terms.s2Body" },
    { title: "Terms.s3Title", body: "Terms.s3Body" },
    { title: "Terms.s4Title", body: "Terms.s4Body" },
    { title: "Terms.s5Title", body: "Terms.s5Body" },
    { title: "Terms.s6Title", body: "Terms.s6Body" },
    { title: "Terms.s7Title", body: "Terms.s7Body" },
  ] as const;

  return (
    <div className="gjm-page px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-[var(--border)]">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          {t("Terms.title", "Terms of Service")}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          {t("Terms.lastUpdated", "Last updated")}: 2026-08-28
        </p>

        <p className="text-[var(--text-body)] leading-relaxed text-sm sm:text-base mb-8">
          {t(
            "Terms.intro",
            "By using Global Job Matching you agree to these terms. Please read them carefully."
          )}
        </p>

        <div className="text-[var(--text-body)] leading-relaxed space-y-6 text-sm sm:text-base">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {t(s.title)}
              </h2>
              <p>{t(s.body)}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-[var(--text-muted)]">
          <Link href="/privacy" className="text-[var(--brand-primary)] hover:underline">
            {t("Privacy.title", "Privacy Policy")}
          </Link>
          {" · "}
          <Link href="/contact" className="text-[var(--brand-primary)] hover:underline">
            {t("Nav.contact", "Contact")}
          </Link>
        </p>
      </div>
    </div>
  );
}
