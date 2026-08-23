import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://global-job-matching.vercel.app";

  const routes = [
    { path: "", priority: 1.0 },
    { path: "/jobs", priority: 0.9 },
    { path: "/pricing", priority: 0.8 },
    { path: "/about", priority: 0.8 },
    { path: "/contact", priority: 0.8 },
    { path: "/help", priority: 0.7 },
    { path: "/saved-jobs", priority: 0.6 },
    { path: "/my-applications", priority: 0.6 },
    { path: "/messages", priority: 0.6 },
    { path: "/notifications", priority: 0.6 },
    { path: "/settings", priority: 0.5 },
    { path: "/dashboard", priority: 0.6 },
    { path: "/employer/dashboard", priority: 0.7 },
    { path: "/employer/post-job", priority: 0.7 },
    { path: "/company/profile", priority: 0.7 },
    { path: "/admin/dashboard", priority: 0.5 },
    { path: "/admin/users", priority: 0.5 },
    { path: "/admin/jobs", priority: 0.5 },
    { path: "/admin/companies", priority: 0.5 },
    { path: "/admin/reports", priority: 0.5 },
    { path: "/admin/categories", priority: 0.5 },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
