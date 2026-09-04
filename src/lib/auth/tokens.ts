import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authRatelimit } from "@/lib/ratelimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const { success } = await authRatelimit.limit(`login_${email}`);
        if (!success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            password: true,
            sessionVersion: true,
          },
        });

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
          role: user.role,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.sub = user.id;
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }

      // Re-validate role + sessionVersion from DB (stale JWT protection)
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { role: true, sessionVersion: true },
          });
          if (!dbUser) {
            return { ...token, error: "SessionInvalid" };
          }
          const tokenVersion = Number(token.sessionVersion ?? 0);
          const dbVersion = dbUser.sessionVersion ?? 0;
          if (tokenVersion !== dbVersion) {
            return { ...token, error: "SessionInvalid" };
          }
          token.role = dbUser.role;
          token.sessionVersion = dbVersion;
        } catch {
          // keep existing token on transient DB errors
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "SessionInvalid") {
        return {
          ...session,
          user: {
            ...session.user,
            id: "",
            role: "",
          },
          expires: new Date(0).toISOString(),
        };
      }
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
