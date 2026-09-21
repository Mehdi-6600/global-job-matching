import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { CredentialsSignin } from "next-auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { authRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { googleAuthConfigured } from "@/lib/env";

/* ------------------------------------------------------------------ */
/* Custom errors                                                       */
/* ------------------------------------------------------------------ */

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

/* ------------------------------------------------------------------ */
/* Session config                                                      */
/* ------------------------------------------------------------------ */

/**
 * 30 days max age, 15 min refresh.
 *
 * The jwt callback performs a DB read on every refresh (sessionVersion
 * check). 60s was far too aggressive (1 query/min/active-user). 15 min
 * gives an acceptable invalidation window after password change while
 * cutting DB load ~14x.
 */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 15 * 60;

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

const googleProvider = googleAuthConfigured
  ? [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        /**
         * We intentionally do NOT set allowDangerousEmailAccountLinking.
         * Safe account-linking is handled in the signIn callback below.
         */
        allowDangerousEmailAccountLinking: false,
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    ...googleProvider,

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const ip =
          request && typeof (request as Request).headers?.get === "function"
            ? getRequestIp(request as Request)
            : "unknown";

        const ipLimit = await safeLimit(authRatelimit, `login_ip_${ip}`);
        if (!ipLimit.success) {
          throw new RateLimitedSignin();
        }

        const emailLimit = await safeLimit(
          authRatelimit,
          `login_email_${email}`,
        );
        if (!emailLimit.success) {
          throw new RateLimitedSignin();
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            role: true,
            sessionVersion: true,
          },
        });

        // No user or no password hash → same as wrong password (no enumeration)
        if (!user?.password) {
          return null;
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Safe account-linking for Google OAuth.
     *
     * When a Google sign-in returns an email that already has an
     * Account+User row created via Credentials, we only allow the
     * accounts to be linked when the existing user is verified.
     *
     * This closes the allowDangerousEmailAccountLinking takeover path
     * while preserving UX for legitimate users who first registered
     * with email/password and then chose Google.
     */
    async signIn({ user, account }) {
      // Credentials path: authorize() already validated.
      if (account?.provider !== "google") {
        return true;
      }

      const email = (user?.email || "").toLowerCase().trim();
      if (!email) return false;

      // Look up existing user by email.
      const existing = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          emailVerified: true,
          password: true,
          accounts: {
            select: { provider: true },
          },
        },
      });

      // Brand new user: Google will create User + Account rows.
      if (!existing) {
        return true;
      }

      // Already linked to Google → allow.
      const alreadyGoogle = existing.accounts.some(
        (a) => a.provider === "google",
      );
      if (alreadyGoogle) {
        return true;
      }

      // Credentials user exists, no Google link yet.
      // Only allow linking when the email was already verified
      // (via our own verification flow or trust the provider).
      if (existing.password && !existing.emailVerified) {
        // Refuse: this is exactly the takeover vector.
        return false;
      }

      // Safe: email is verified → allow Google to link.
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        let role = (user as { role?: string }).role;
        let sessionVersion = (
          user as { sessionVersion?: number }
        ).sessionVersion;

        // OAuth (Google): adapter user may omit role/sessionVersion — load from DB
        if (sessionVersion == null || role == null) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: user.id },
              select: { role: true, sessionVersion: true },
            });
            if (dbUser) {
              role = role ?? dbUser.role;
              sessionVersion =
                sessionVersion ?? dbUser.sessionVersion ?? 0;
            }
          } catch {
            /* keep defaults */
          }
        }

        token.role = role ?? "JOB_SEEKER";
        token.sessionVersion = sessionVersion ?? 0;
        delete token.error;
        return token;
      }

      if (!token.sub) {
        return token;
      }

      if (token.error === "SessionInvalidated") {
        return token;
      }

      try {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: {
            sessionVersion: true,
            role: true,
          },
        });

        if (!dbUser) {
          return {
            ...token,
            error: "SessionInvalidated" as const,
            sub: undefined,
            role: undefined,
            sessionVersion: undefined,
          };
        }

        const tokenVersion =
          typeof token.sessionVersion === "number"
            ? token.sessionVersion
            : -1;

        if (dbUser.sessionVersion !== tokenVersion) {
          return {
            ...token,
            error: "SessionInvalidated" as const,
            sub: undefined,
            role: undefined,
            sessionVersion: undefined,
          };
        }

        token.role = dbUser.role;
        token.sessionVersion = dbUser.sessionVersion;
      } catch (error) {
        console.error("JWT sessionVersion check failed:", error);
        return {
          ...token,
          error: "SessionInvalidated" as const,
          sub: undefined,
          role: undefined,
          sessionVersion: undefined,
        };
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
          expires: new Date(0).toISOString(),
        };
      }

      if (session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) || "JOB_SEEKER";
      }

      return session;
    },
  },
});
