import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://globaljobmatching.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/settings/", "/messages/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
