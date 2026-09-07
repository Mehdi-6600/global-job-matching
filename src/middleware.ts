import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const response = NextResponse.next();

  // Baseline security headers (API + pages)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Do not index authenticated app shells aggressively
  const path = req.nextUrl.pathname;
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/employer") ||
    path.startsWith("/settings") ||
    path.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
