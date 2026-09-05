import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/roles";

/**
 * Edge-compatible auth config for middleware only.
 * Full credentials + sessionVersion checks live in src/lib/auth.ts (Node).
 * Middleware trusts JWT claims; server routes re-validate via jwt callback.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as { id?: string }).id = (user as { id?: string }).id;
        (token as { role?: string }).role = (user as { role?: string }).role;
        (token as { sessionVersion?: number }).sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "SessionInvalidated" || !token.sub) {
        return {
          ...session,
          user: {
            id: "",
            role: "",
            name: null,
            email: null,
            image: null,
          },
          error: "SessionInvalidated",
        };
      }

      if (session.user) {
        (session.user as { id?: string }).id = token.sub as string;
        (session.user as { role?: string }).role = (token.role as string) || "";
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user?.id;
      const userRole = (auth?.user as { role?: string } | undefined)?.role;
      const sessionError = (auth as { error?: string } | null)?.error;

      if (sessionError === "SessionInvalidated") {
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/")
        ) {
          return true;
        }
        return false;
      }

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
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60,
  },
} satisfies NextAuthConfig;
