import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getPublicJobsPage } from "@/lib/jobs/get-public-jobs-page";
import { JobsClient } from "./JobsClient";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getDictionary, t } from "@/lib/i18n/get-dictionary";
import {
  buildPublicMetadata,
} from "@/lib/seo/core";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);

  const title = t(dict, "Jobs.title", "Browse Jobs");
  const description = t(
    dict,
    "Jobs.subtitle",
    "Explore active job listings worldwide. Filter by location, remote work, and role on Global Job Matching."
  );

  return buildPublicMetadata({
    title,
    description,
    path: "/jobs",
    index: true,
    hreflang: true,
    locale,
  });
}

/**
 * Server-rendered first page of jobs so Google sees real titles/companies
 * (avoids Soft 404 on the client-only listing shell).
 */
export default async function JobsPage() {
  const { jobs, totalPages } = await getPublicJobsPage(12);

  return (
    <JobsClient initialJobs={jobs} initialTotalPages={totalPages} />
  );
}
