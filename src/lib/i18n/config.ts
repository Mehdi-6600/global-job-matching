export const locales = ["en", "es", "ar", "fa", "hi", "fr", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Cookie name used by both client and server */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** localStorage key for client preference */
export const LOCALE_STORAGE_KEY = "gjm_locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ar: "العربية",
  fa: "فارسی",
  hi: "हिन्दी",
  fr: "Français",
  de: "Deutsch",
};

export const rtlLocales: readonly Locale[] = ["ar", "fa"];

/**
 * Type guard: accepts string | null | undefined | unknown.
 * Never throws; returns false for invalid values.
 */
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (locales as readonly string[]).includes(value)
  );
}

export function isRtlLocale(locale: Locale): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}
