import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://globaljobmatching.com";

  const staticPages = [
    "",
    "/jobs",
    "/companies",
    "/pricing",
    "/about",
    "/contact",
    "/blog",
    "/terms",
    "/privacy",
    "/login",
    "/register",
  ];

  return staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/jobs" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" ? 0.9 : 0.6,
  }));
}
