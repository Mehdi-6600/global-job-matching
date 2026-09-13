import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/locale-path";
import { absoluteUrl } from "@/lib/site-url";

/**
 * Build alternates.languages for Next.js Metadata.
 * Default locale (en) uses unprefixed URLs; others use /{locale}/...
 */
export function buildHreflangLanguages(
  pathname: string
): Record<string, string> {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = absoluteUrl(localizePath(path, locale));
  }

  languages["x-default"] = absoluteUrl(localizePath(path, defaultLocale));

  return languages;
}

export function hreflangForLocales(
  pathname: string,
  only: Locale[] = [...locales]
): Record<string, string> {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const languages: Record<string, string> = {};
  for (const locale of only) {
    languages[locale] = absoluteUrl(localizePath(path, locale));
  }
  languages["x-default"] = absoluteUrl(localizePath(path, defaultLocale));
  return languages;
}
