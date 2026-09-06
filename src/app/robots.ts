import type { MetadataRoute } from "next";

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://global-job-matching.vercel.app"
  ).replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const base = siteBase();

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
          "/resume-builder",
          "/payment",
          "/account",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
