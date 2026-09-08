import {
  defaultLocale,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Always returns a valid Locale.
 * Use for cookies, query params, headers, and any untrusted input.
 */
export function resolveLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  return defaultLocale;
}

/**
 * Resolve from multiple sources (first valid wins).
 * Example: cookie, header, stored preference.
 */
export function resolveLocaleFromCandidates(
  ...candidates: unknown[]
): Locale {
  for (const c of candidates) {
    if (isLocale(c)) return c;
  }
  return defaultLocale;
}
