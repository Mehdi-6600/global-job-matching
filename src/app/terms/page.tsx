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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("Terms.title", "Terms of Service")}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {t("Terms.lastUpdated", "Last updated")}: 2026-08-28
        </p>

        <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-8">
          {t(
            "Terms.intro",
            "By using Global Job Matching you agree to these terms. Please read them carefully."
          )}
        </p>

        <div className="text-slate-300 leading-relaxed space-y-6 text-sm sm:text-base">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white mb-2">
                {t(s.title)}
              </h2>
              <p>{t(s.body)}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-slate-500">
          <Link href="/privacy" className="text-cyan-400 hover:underline">
            {t("Privacy.title", "Privacy Policy")}
          </Link>
          {" · "}
          <Link href="/contact" className="text-cyan-400 hover:underline">
            {t("Nav.contact", "Contact")}
          </Link>
        </p>
      </div>
    </main>
  );
}
