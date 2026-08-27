import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // فقط برای Edge؛ providers واقعی در auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as { role?: string } | undefined)?.role;

      // ─── صفحات عمومی (بدون نیاز به لاگین) ───
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

      // ─── صفحات auth ───
      const AUTH_PAGES = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ];

      // ─── APIهای عمومی (GET بدون لاگین) ───
      // این‌ها نباید به /login ریدایرکت شوند
      const isPublicApi =
        pathname.startsWith("/api/auth") ||
        pathname === "/api/jobs" ||
        pathname.startsWith("/api/jobs/") ||
        pathname === "/api/companies" ||
        pathname.startsWith("/api/companies/") ||
        pathname === "/api/blog" ||
        pathname.startsWith("/api/blog/") ||
        pathname === "/api/subscribe" ||
        pathname === "/api/contact" ||
        pathname === "/api/seed"; // اگر seed عمومی است؛ در غیر این صورت حذف کن

      if (isPublicApi) {
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

      // صفحات لاگین / ثبت‌نام
      if (AUTH_PAGES.includes(pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // بقیه مسیرها (صفحات + APIهای خصوصی) نیاز به لاگین دارند
      if (!isLoggedIn) {
        return false; // NextAuth به /login ریدایرکت می‌کند
      }

      // محدودیت ادمین
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
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
