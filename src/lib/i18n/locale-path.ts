import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n/config";

const LOCALE_PREFIX_RE = new RegExp(
  `^/(${locales.join("|")})(?=/|$)`,
  "i"
);

export type ParsedLocalePath = {
  /** Locale from prefix, or null if bare path */
  localeFromPath: Locale | null;
  /** Path without locale prefix (always starts with /) */
  pathname: string;
};

/**
 * /fa/jobs → { localeFromPath: "fa", pathname: "/jobs" }
 * /jobs → { localeFromPath: null, pathname: "/jobs" }
 */
export function parseLocalePath(pathname: string): ParsedLocalePath {
  const raw = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const match = raw.match(LOCALE_PREFIX_RE);
  if (!match) {
    return { localeFromPath: null, pathname: raw || "/" };
  }
  const code = match[1].toLowerCase();
  const locale = isLocale(code) ? code : null;
  const rest = raw.slice(match[0].length) || "/";
  return {
    localeFromPath: locale,
    pathname: rest.startsWith("/") ? rest : `/${rest}`,
  };
}

export function stripLocaleFromPathname(pathname: string): string {
  return parseLocalePath(pathname).pathname;
}

/**
 * English (default): no prefix — /jobs
 * Other locales: /fa/jobs
 */
export function localizePath(pathname: string, locale: Locale): string {
  const base = stripLocaleFromPathname(pathname);
  const path = base === "/" ? "/" : base.replace(/\/$/, "") || "/";
  if (locale === defaultLocale) {
    return path;
  }
  if (path === "/") {
    return `/${locale}`;
  }
  return `/${locale}${path}`;
}

/** Absolute localized URL builder uses site origin separately */
export function localizedHref(pathname: string, locale: Locale): string {
  return localizePath(pathname, locale);
}

export function isLocalePrefixedPath(pathname: string): boolean {
  return parseLocalePath(pathname).localeFromPath != null;
}
