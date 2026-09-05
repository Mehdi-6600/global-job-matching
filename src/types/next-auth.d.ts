import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    error?: string;
  }

  interface User {
    role: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    sessionVersion?: number;
    error?: "SessionInvalidated" | "RateLimited";
  }
}
