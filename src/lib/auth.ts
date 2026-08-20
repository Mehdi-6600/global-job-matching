import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // فقط برای تست
        if (credentials?.email === "test@test.com" && credentials?.password === "123456") {
          return {
            id: "1",
            name: "Test User",
            email: "test@test.com",
            role: "JOB_SEEKER",
          };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: "secret",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role: string;
  }
}
