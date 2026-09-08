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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-8 sm:p-12 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("Privacy.title", "Privacy Policy")}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {t("Privacy.lastUpdated", "Last updated")}: 2026-08-28
        </p>

        <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-8">
          {t(
            "Privacy.intro",
            "This policy explains how Global Job Matching collects, uses, and protects your information."
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
          <Link href="/terms" className="text-cyan-400 hover:underline">
            {t("Terms.title", "Terms of Service")}
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
