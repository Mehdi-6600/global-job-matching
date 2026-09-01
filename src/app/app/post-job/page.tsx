import { redirect } from "next/navigation";

/**
 * Legacy nested route.
 * Real post-job UI lives at /employer/post-job.
 */
export default function LegacyPostJobPage() {
  redirect("/employer/post-job");
}
