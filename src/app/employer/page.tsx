import { redirect } from "next/navigation";

/**
 * Canonical employer home is /employer/dashboard.
 * This path only redirects to avoid a duplicate dashboard.
 */
export default function EmployerIndexPage() {
  redirect("/employer/dashboard");
}
