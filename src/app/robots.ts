import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://global-job-matching.vercel.app";

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
          "/saved-jobs",
          "/notifications",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
