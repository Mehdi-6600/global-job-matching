import Link from "next/link";

type Props = {
  /** Optional extra class on the outer wrapper */
  className?: string;
};

/**
 * Shared internal links for SEO discoverability.
 * Used under job detail and other public content pages.
 * Paths are unprefixed; locale middleware + LanguageSwitcher handle locale.
 */
export function InternalHubLinks({ className = "" }: Props) {
  const links = [
    { href: "/jobs", label: "All jobs" },
    { href: "/companies", label: "Companies" },
    { href: "/locations", label: "Jobs by location" },
    { href: "/categories", label: "Jobs by category" },
    { href: "/career-risk", label: "AI Career Risk" },
    { href: "/resume-builder", label: "Resume builder" },
    { href: "/blog", label: "Career blog" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <nav
      aria-label="Related sections"
      className={`mt-10 pt-8 border-t border-white/10 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        Explore more
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:border-sky-500/40 hover:text-sky-300 transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
