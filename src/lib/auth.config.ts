import type { NextAuthConfig } from "next-auth";

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

      // همه APIها را از middleware عبور بده — خود route کد 401 برمی‌گرداند
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
        if (userRole !== "ADMIN" && userRole !== "OWNER") {
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
