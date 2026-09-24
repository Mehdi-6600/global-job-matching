import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import {
  pathShouldNoindexWhenQueried,
  urlHasIndexableQueryNoise,
} from "@/lib/seo/listing-policy";
import { parseLocalePath } from "@/lib/i18n/locale-path";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { localeCookieOptions } from "@/lib/i18n/cookie";

const { auth } = NextAuth(authConfig);

/**
 * Paths that must never be indexed by search engines, regardless of query
 * string. These are private / authenticated / API routes.
 */
function isAlwaysNoindex(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/employer") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin")
  );
}

/**
 * Paths that must not be cached by shared caches (private data).
 */
function isPrivateNoStore(pathname: string): boolean {
  return isAlwaysNoindex(pathname);
}

export default auth((req) => {
  const url = req.nextUrl.clone();
  const { localeFromPath, pathname: strippedPath } = parseLocalePath(
    url.pathname
  );

  // Locale-prefixed URL → rewrite to unprefixed app route + set locale cookie
  if (localeFromPath && isLocale(localeFromPath)) {
    url.pathname = strippedPath;
    const response = NextResponse.rewrite(url);

    const cookie = localeCookieOptions();
    response.cookies.set(LOCALE_COOKIE, localeFromPath, cookie);

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    if (isPrivateNoStore(strippedPath)) {
      response.headers.set("Cache-Control", "private, no-store");
    }

    // Private paths → always noindex. Public listing pages → noindex only
    // when the query string carries indexable noise (filters, sort, page...).
    if (
      isAlwaysNoindex(strippedPath) ||
      (pathShouldNoindexWhenQueried(strippedPath) &&
        urlHasIndexableQueryNoise(req.nextUrl.searchParams))
    ) {
      response.headers.set(
        "X-Robots-Tag",
        isAlwaysNoindex(strippedPath)
          ? "noindex, nofollow"
          : "noindex, follow"
      );
    }

    return response;
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  const path = req.nextUrl.pathname;

  if (isPrivateNoStore(path)) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (
    isAlwaysNoindex(path) ||
    (pathShouldNoindexWhenQueried(path) &&
      urlHasIndexableQueryNoise(req.nextUrl.searchParams))
  ) {
    response.headers.set(
      "X-Robots-Tag",
      isAlwaysNoindex(path) ? "noindex, nofollow" : "noindex, follow"
    );
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
