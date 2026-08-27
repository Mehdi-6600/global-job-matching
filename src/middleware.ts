import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * همه مسیرها به‌جز:
     * - _next/static
     * - _next/image
     * - favicon
     * - فایل‌های استاتیک (با پسوند)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
