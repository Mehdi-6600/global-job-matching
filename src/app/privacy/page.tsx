"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export default function PrivacyPage() {
  const { t } = useLocale();

  const sections = [
    { title: "Privacy.s1Title", body: "Privacy.s1Body" },
    { title: "Privacy.s2Title", body: "Privacy.s2Body" },
    { title: "Privacy.s3Title", body: "Privacy.s3Body" },
    { title: "Privacy.s4Title", body: "Privacy.s4Body" },
    { title: "Privacy.s5Title", body: "Privacy.s5Body" },
    { title: "Privacy.s6Title", body: "Privacy.s6Body" },
    { title: "Privacy.s7Title", body: "Privacy.s7Body" },
  ] as const;

  return (
    <div className="gjm-page px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-[var(--border)]">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          {t("Privacy.title", "Privacy Policy")}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          {t("Privacy.lastUpdated", "Last updated")}: 2026-08-28
        </p>

        <p className="text-[var(--text-body)] leading-relaxed text-sm sm:text-base mb-8">
          {t(
            "Privacy.intro",
            "This policy explains how Global Job Matching collects, uses, and protects your information."
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
          <Link href="/terms" className="text-[var(--brand-primary)] hover:underline">
            {t("Terms.title", "Terms of Service")}
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
