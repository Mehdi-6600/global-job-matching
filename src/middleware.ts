import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./src/lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});

export default async function middleware(request: NextRequest) {
  // Handle internationalization first
  const response = intlMiddleware(request);

  // Auth checks for protected routes could go here
  // But we handle auth at the page/API level for flexibility

  return response;
}

export const config = {
  matcher: ["/", "/(en|es|ar|fa|hi|fr)/:path*"],
};
