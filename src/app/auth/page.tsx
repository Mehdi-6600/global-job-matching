import { redirect } from "next/navigation";

/**
 * Legacy /auth route — canonical pages are /login and /register.
 */
export default function AuthPage() {
  redirect("/login");
}
