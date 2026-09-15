import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
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
    // Next.js multi-sitemap: /sitemap.xml is the index (id=0,1,2,...)
    sitemap: `${base}/sitemap.xml`,
  };
}
