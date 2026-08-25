import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/admin",
  "/employer",
  "/dashboard",
  "/settings",
  "/messages",
  "/my-applications",
  "/saved-jobs",
  "/my-interviews",
  "/job-alerts",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/employer/:path*",
    "/dashboard/:path*",
    "/settings",
    "/messages/:path*",
    "/my-applications",
    "/saved-jobs",
    "/my-interviews",
    "/job-alerts",
  ],
};
