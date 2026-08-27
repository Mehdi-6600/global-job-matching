import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * همه چیز به‌جز static و فایل‌های با پسوند
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
