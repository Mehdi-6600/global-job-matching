import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authRatelimit } from "@/lib/ratelimit";
import { safeLimit } from "@/lib/safe-ratelimit";
import { getRequestIp } from "@/lib/client-ip";

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
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

        const emailLimit = await safeLimit(authRatelimit, `login_email_${email}`);
        if (!emailLimit.success) {
          throw new RateLimitedSignin();
        }

        const user = await prisma.user.findUnique({
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
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
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
        const dbUser = await prisma.user.findUnique({
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
          typeof token.sessionVersion === "number" ? token.sessionVersion : -1;

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
