import type { Locale } from "@/lib/i18n/config";
import { locales } from "@/lib/i18n/config";

/**
 * Open Graph locale tags (language_TERRITORY).
 * Used for social previews; not a substitute for URL-based hreflang.
 */
export const ogLocaleByAppLocale: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
  ar: "ar_SA",
  fa: "fa_IR",
  hi: "hi_IN",
  fr: "fr_FR",
  de: "de_DE",
};

export function toOgLocale(locale: Locale): string {
  return ogLocaleByAppLocale[locale] || "en_US";
}

/** All OG locale codes for the product language set */
export function allOgLocales(): string[] {
  return locales.map((l) => ogLocaleByAppLocale[l]);
}
