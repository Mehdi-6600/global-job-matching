"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" className="text-lg font-bold text-white">
              G<span className="text-sky-400">JM</span>
            </Link>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">
              {t(
                "Footer.tagline",
                "Global Job Matching — find roles and hire talent with a clear, modern job board."
              )}
            </p>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-3">
              {t("Footer.explore", "Explore")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/jobs"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Nav.jobs", "Jobs")}
                </Link>
              </li>
              <li>
                <Link
                  href="/companies"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Nav.companies", "Companies")}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Nav.pricing", "Pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Nav.about", "About")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-3">
              {t("Footer.legal", "Legal")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Footer.terms", "Terms of Service")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Footer.privacy", "Privacy Policy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  {t("Nav.contact", "Contact")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs sm:text-sm">
            © {year} Global Job Matching. {t("Footer.rights", "All rights reserved.")}
          </p>
          <p className="text-slate-600 text-xs">
            {t("Footer.builtFor", "Built for seekers & employers")}
          </p>
        </div>
      </div>
    </footer>
  );
}
