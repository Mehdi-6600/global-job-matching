import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";
import { ROLES } from "./roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const authResult = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        if (user.status === "SUSPENDED") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = user.id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token as any).id as string;
        session.user.role = (token as any).role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.email === env.OWNER_EMAIL) {
        await db.user.update({
          where: { id: user.id },
          data: { role: ROLES.OWNER },
        });
      }
    },
  },
});

export const handlers = authResult.handlers;
export const auth = authResult.auth;
export const signIn = authResult.signIn;
export const signOut = authResult.signOut;
