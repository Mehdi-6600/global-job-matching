import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import {
  pathShouldNoindexWhenQueried,
  urlHasIndexableQueryNoise,
} from "@/lib/seo/listing-policy";
import { parseLocalePath } from "@/lib/i18n/locale-path";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const url = req.nextUrl.clone();
  const { localeFromPath, pathname: strippedPath } = parseLocalePath(
    url.pathname
  );

  // Locale-prefixed URL → rewrite to unprefixed app route + set locale cookie
  if (localeFromPath && isLocale(localeFromPath)) {
    url.pathname = strippedPath;
    const response = NextResponse.rewrite(url);

    response.cookies.set(LOCALE_COOKIE, localeFromPath, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    if (
      strippedPath.startsWith("/dashboard") ||
      strippedPath.startsWith("/employer") ||
      strippedPath.startsWith("/settings") ||
      strippedPath.startsWith("/api/")
    ) {
      response.headers.set("Cache-Control", "private, no-store");
    }

    if (
      pathShouldNoindexWhenQueried(strippedPath) &&
      urlHasIndexableQueryNoise(req.nextUrl.searchParams)
    ) {
      response.headers.set("X-Robots-Tag", "noindex, follow");
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
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/employer") ||
    path.startsWith("/settings") ||
    path.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  if (
    pathShouldNoindexWhenQueried(path) &&
    urlHasIndexableQueryNoise(req.nextUrl.searchParams)
  ) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
