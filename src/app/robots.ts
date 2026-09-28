import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/jobs",
          "/api/jobs/",
          "/api/auth/session",
        ],
        disallow: [
          "/api/",
          "/api/jobs/create",
          "/api/jobs/employer",
          "/api/jobs/fetch",
          "/api/jobs/match",
          "/api/jobs/sync",
          "/api/jobs/*/applicants",
          "/api/jobs/*/contact-employer",
          "/api/jobs/*/match",
          "/dashboard/",
          "/settings/",
          "/messages/",
          "/admin/",
          "/employer/",
          "/bootstrap-owner",
          "/my-applications",
          "/my-interviews",
          "/saved-jobs",
          "/notifications",
          "/job-alerts",
          "/profile",
          "/payment",
          "/account",
          "/verify-email",
          "/reset-password",
          "/login",
          "/register",
        ],
      },
    ],
    host: base,
    sitemap: `${base}/sitemaps.xml`,
  };
}
