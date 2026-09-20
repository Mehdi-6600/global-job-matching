import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type LocaleCookieOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
};

/**
 * Canonical cookie options for the locale preference cookie.
 * Used by both the middleware (edge) and the client LocaleProvider so
 * the two writers can never drift apart.
 */
export function localeCookieOptions(
  options: LocaleCookieOptions = {}
): {
  path: string;
  maxAge: number;
  sameSite: "lax" | "strict" | "none";
} {
  return {
    path: options.path ?? "/",
    maxAge: options.maxAge ?? LOCALE_COOKIE_MAX_AGE,
    sameSite: options.sameSite ?? "lax",
  };
}

/**
 * Serialize the locale cookie for `document.cookie`.
 * Client-only; ignores errors (e.g. Safari private mode).
 */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  try {
    const { path, maxAge, sameSite } = localeCookieOptions();
    document.cookie = `${LOCALE_COOKIE}=${locale};path=${path};max-age=${maxAge};samesite=${sameSite}`;
  } catch {
    // ignore
  }
}
