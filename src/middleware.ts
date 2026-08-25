import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";

const PUBLIC_ROUTES = ["/", "/jobs", "/pricing", "/about", "/contact", "/terms", "/privacy", "/companies"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role as string | undefined;
  const path = nextUrl.pathname;

  if (path.startsWith("/api/auth")) return NextResponse.next();
  if (PUBLIC_ROUTES.includes(path)) return NextResponse.next();
  if (path.startsWith("/_next") || path === "/favicon.ico") return NextResponse.next();

  if (AUTH_ROUTES.includes(path)) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));

  if (path.startsWith("/dashboard/admin") && userRole !== ROLES.ADMIN && userRole !== ROLES.OWNER) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\\\.).*)"],
};
