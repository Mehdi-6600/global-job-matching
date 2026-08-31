import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/roles";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    // Role must be on the token for Edge middleware (authorized)
    async jwt({ token, user }) {
      if (user) {
        (token as { id?: string }).id = (user as { id?: string }).id;
        (token as { role?: string }).role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token as { id?: string }).id as string;
        (session.user as { role?: string }).role = (token as { role?: string })
          .role as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as { role?: string } | undefined)?.role;

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
