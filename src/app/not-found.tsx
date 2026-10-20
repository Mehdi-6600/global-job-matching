import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Briefcase, Home, Layers, MapPin, ShieldAlert } from "lucide-react";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const links = [
    { href: "/", label: t(dict, "Nav.home", "Home"), icon: Home },
    { href: "/jobs", label: t(dict, "Nav.jobs", "Jobs"), icon: Briefcase },
    {
      href: "/locations",
      label: t(dict, "Nav.locations", "Locations"),
      icon: MapPin,
    },
    {
      href: "/categories",
      label: t(dict, "Nav.categories", "Categories"),
      icon: Layers,
    },
    {
      href: "/career-risk",
      label: t(dict, "Nav.careerRisk", "Career Risk"),
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="gjm-page">
      <div className="gjm-container">
        <div className="mx-auto max-w-lg rounded-[var(--radius-2xl)] border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-2)] sm:p-10">
          <p className="tabular text-[3.5rem] font-[650] leading-none tracking-[-0.05em] text-[var(--brand-primary)]">
            404
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {t(dict, "Common.pageNotFound", "Page not found")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {t(
              dict,
              "Common.pageNotFoundDesc",
              "This page does not exist or was moved. Try one of these popular sections:",
            )}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                >
                  <Icon size={15} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
