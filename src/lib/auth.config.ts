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

      const PUBLIC_ROUTES = [
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

      const AUTH_ROUTES = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ];

      // API auth همیشه آزاد
      if (pathname.startsWith("/api/auth")) return true;

      // مسیرهای عمومی
      if (
        PUBLIC_ROUTES.includes(pathname) ||
        pathname.startsWith("/jobs/") ||
        pathname.startsWith("/companies/") ||
        pathname.startsWith("/blog/")
      ) {
        return true;
      }

      // صفحات لاگین/ثبت‌نام
      if (AUTH_ROUTES.includes(pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // بقیه نیاز به لاگین دارند
      if (!isLoggedIn) {
        return false; // NextAuth به /login ریدایرکت می‌کند
      }

      // ادمین
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
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
