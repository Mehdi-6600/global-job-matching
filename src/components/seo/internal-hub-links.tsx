import Link from "next/link";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";

type Props = {
  /** Optional extra class on the outer wrapper */
  className?: string;
};

/**
 * Shared internal links for SEO discoverability.
 *
 * Used under job detail and other public content pages. Paths are unprefixed;
 * locale middleware + LanguageSwitcher handle locale. Labels come from the
 * active locale's dictionary (resolved from the cookie, so this stays a server
 * component and still renders the right language on first paint).
 */
export async function InternalHubLinks({ className = "" }: Props) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const links = [
    { href: "/jobs", label: t(dict, "Nav.jobs", "Jobs") },
    { href: "/companies", label: t(dict, "Nav.companies", "Companies") },
    { href: "/locations", label: t(dict, "Nav.locations", "Locations") },
    { href: "/categories", label: t(dict, "Nav.categories", "Categories") },
    { href: "/career-risk", label: t(dict, "Nav.careerRisk", "Career risk") },
    { href: "/resume-builder", label: t(dict, "Nav.resume", "Resume builder") },
    { href: "/blog", label: t(dict, "Nav.blog", "Blog") },
    { href: "/pricing", label: t(dict, "Nav.pricing", "Pricing") },
  ];

  return (
    <nav
      aria-label={t(dict, "Common.relatedSections", "Related sections")}
      className={`mt-10 border-t border-[var(--border-soft)] pt-8 ${className}`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        {t(dict, "Common.exploreMore", "Explore more")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-body)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
