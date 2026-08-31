import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/roles";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as { role?: string } | undefined)?.role;

      // API routes handle their own 401/403
      if (pathname.startsWith("/api/")) {
        return true;
      }

      const PUBLIC_PAGES = [
        "/",
        "/jobs",
        "/pricing",
        "/about",
        "/contact",
        "/terms",
        "/privacy",
        "/companies",
        "/blog",
        "/search",
      ];

      const AUTH_PAGES = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ];

      if (
        PUBLIC_PAGES.includes(pathname) ||
        pathname.startsWith("/jobs/") ||
        pathname.startsWith("/companies/") ||
        pathname.startsWith("/blog/")
      ) {
        return true;
      }

      if (AUTH_PAGES.includes(pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      if (
        pathname.startsWith("/dashboard/admin") ||
        pathname.startsWith("/admin")
      ) {
        if (userRole !== ROLES.ADMIN && userRole !== ROLES.OWNER) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
      }

      // Employer area: job seekers should not access
      if (pathname.startsWith("/employer")) {
        if (
          userRole !== ROLES.EMPLOYER &&
          userRole !== ROLES.ADMIN &&
          userRole !== ROLES.OWNER
        ) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
      }

      return true;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
} satisfies NextAuthConfig;
