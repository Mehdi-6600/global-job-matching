import type { BreadcrumbItem } from "@/lib/seo/json-ld";

export function jobBreadcrumbs(params: {
  jobTitle: string;
  jobId: string;
  companyName?: string | null;
  companyId?: string | null;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: "Jobs", path: "/jobs" },
  ];
  if (params.companyId && params.companyName) {
    items.push({
      name: params.companyName,
      path: `/companies/${params.companyId}`,
    });
  }
  items.push({
    name: params.jobTitle,
    path: `/jobs/${params.jobId}`,
  });
  return items;
}

export function companyBreadcrumbs(params: {
  companyName: string;
  companyId: string;
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Companies", path: "/companies" },
    { name: params.companyName, path: `/companies/${params.companyId}` },
  ];
}

export function blogBreadcrumbs(params: {
  title: string;
  slug: string;
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: params.title, path: `/blog/${params.slug}` },
  ];
}
