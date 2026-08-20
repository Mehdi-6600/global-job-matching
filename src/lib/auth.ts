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
        // تست ساده
        if (credentials?.email === "test@test.com" && credentials?.password === "123456") {
          return {
            id: "1",
            name: "Test User",
            email: "test@test.com",
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
});
