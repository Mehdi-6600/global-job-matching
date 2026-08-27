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

      // APIهای عمومی — بدون لاگین
      if (
        pathname.startsWith("/api/auth") ||
        pathname === "/api/jobs" ||
        (pathname.startsWith("/api/jobs/") &&
          !pathname.includes("/applicants")) ||
        pathname === "/api/companies" ||
        pathname.startsWith("/api/companies/") ||
        pathname === "/api/blog" ||
        pathname.startsWith("/api/blog/") ||
        pathname === "/api/subscribe" ||
        pathname === "/api/contact"
      ) {
        return true;
      }

      // صفحات عمومی
      if (
        PUBLIC_PAGES.includes(pathname) ||
        pathname.startsWith("/jobs/") ||
        pathname.startsWith("/companies/") ||
        pathname.startsWith("/blog/")
      ) {
        return true;
      }

      // صفحات auth
      if (AUTH_PAGES.includes(pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // بقیه نیاز به لاگین
      if (!isLoggedIn) {
        return false;
      }

      // فقط ادمین
      if (
        pathname.startsWith("/dashboard/admin") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/api/admin")
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
