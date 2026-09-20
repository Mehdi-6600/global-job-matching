import type { BreadcrumbItem } from "@/lib/seo/json-ld";
import type { CareerRiskLocale } from "@/types/career-risk";

/**
 * Breadcrumb label translations for all supported locales.
 * Keys are the canonical English labels used across the app.
 */
const BREADCRUMB_LABELS: Record<
  string,
  Record<CareerRiskLocale, string>
> = {
  Home: {
    en: "Home",
    fa: "خانه",
    ar: "الرئيسية",
    es: "Inicio",
    fr: "Accueil",
    hi: "होम",
    de: "Startseite",
  },
  Jobs: {
    en: "Jobs",
    fa: "مشاغل",
    ar: "الوظائف",
    es: "Empleos",
    fr: "Emplois",
    hi: "नौकरियाँ",
    de: "Jobs",
  },
  Companies: {
    en: "Companies",
    fa: "شرکت‌ها",
    ar: "الشركات",
    es: "Empresas",
    fr: "Entreprises",
    hi: "कंपनियाँ",
    de: "Unternehmen",
  },
  Blog: {
    en: "Blog",
    fa: "بلاگ",
    ar: "المدونة",
    es: "Blog",
    fr: "Blog",
    hi: "ब्लॉग",
    de: "Blog",
  },
  Locations: {
    en: "Locations",
    fa: "مکان‌ها",
    ar: "المواقع",
    es: "Ubicaciones",
    fr: "Lieux",
    hi: "स्थान",
    de: "Standorte",
  },
  Categories: {
    en: "Categories",
    fa: "دسته‌بندی‌ها",
    ar: "الفئات",
    es: "Categorías",
    fr: "Catégories",
    hi: "श्रेणियाँ",
    de: "Kategorien",
  },
};

function label(key: string, locale?: CareerRiskLocale): string {
  if (!locale) return key;
  return BREADCRUMB_LABELS[key]?.[locale] || key;
}

export function jobBreadcrumbs(params: {
  jobTitle: string;
  jobId: string;
  companyName?: string | null;
  companyId?: string | null;
  locale?: CareerRiskLocale;
}): BreadcrumbItem[] {
  const loc = params.locale;
  const items: BreadcrumbItem[] = [
    { name: label("Home", loc), path: "/" },
    { name: label("Jobs", loc), path: "/jobs" },
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
  locale?: CareerRiskLocale;
}): BreadcrumbItem[] {
  const loc = params.locale;
  return [
    { name: label("Home", loc), path: "/" },
    { name: label("Companies", loc), path: "/companies" },
    { name: params.companyName, path: `/companies/${params.companyId}` },
  ];
}

export function blogBreadcrumbs(params: {
  title: string;
  slug: string;
  locale?: CareerRiskLocale;
}): BreadcrumbItem[] {
  const loc = params.locale;
  return [
    { name: label("Home", loc), path: "/" },
    { name: label("Blog", loc), path: "/blog" },
    { name: params.title, path: `/blog/${params.slug}` },
  ];
}

export function locationBreadcrumbs(params: {
  name: string;
  slug: string;
  locale?: CareerRiskLocale;
}): BreadcrumbItem[] {
  const loc = params.locale;
  return [
    { name: label("Home", loc), path: "/" },
    { name: label("Locations", loc), path: "/locations" },
    { name: params.name, path: `/locations/${params.slug}` },
  ];
}

export function categoryBreadcrumbs(params: {
  name: string;
  slug: string;
  locale?: CareerRiskLocale;
}): BreadcrumbItem[] {
  const loc = params.locale;
  return [
    { name: label("Home", loc), path: "/" },
    { name: label("Categories", loc), path: "/categories" },
    { name: params.name, path: `/categories/${params.slug}` },
  ];
}
