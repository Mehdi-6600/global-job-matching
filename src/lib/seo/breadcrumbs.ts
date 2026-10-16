import type { BreadcrumbItem } from "@/lib/seo/json-ld";
import type { Locale } from "@/lib/i18n/config";

/**
 * Breadcrumb label translations for all supported locales.
 * Keys are the canonical English labels used across the app.
 *
 * Callers that omit `locale` receive the English label (backward compatible).
 */
const BREADCRUMB_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  Home: {
    en: "Home",
    fa: "خانه",
    ar: "الرئيسية",
    es: "Inicio",
    fr: "Accueil",
    hi: "होम",
    de: "Startseite",
    pt: "Início",
    tr: "Ana Sayfa",
    zh: "首页",
    ja: "ホーム",
    id: "Beranda",
  },
  Jobs: {
    en: "Jobs",
    fa: "مشاغل",
    ar: "الوظائف",
    es: "Empleos",
    fr: "Emplois",
    hi: "नौकरियाँ",
    de: "Jobs",
    pt: "Vagas",
    tr: "İş İlanları",
    zh: "职位",
    ja: "求人情報",
    id: "Lowongan Kerja",
  },
  Companies: {
    en: "Companies",
    fa: "شرکت‌ها",
    ar: "الشركات",
    es: "Empresas",
    fr: "Entreprises",
    hi: "कंपनियाँ",
    de: "Unternehmen",
    pt: "Empresas",
    tr: "Şirketler",
    zh: "企业",
    ja: "企業情報",
    id: "Perusahaan",
  },
  Blog: {
    en: "Blog",
    fa: "بلاگ",
    ar: "المدونة",
    es: "Blog",
    fr: "Blog",
    hi: "ब्लॉग",
    de: "Blog",
    pt: "Blog",
    tr: "Blog",
    zh: "博客",
    ja: "ブログ",
    id: "Blog",
  },
  Locations: {
    en: "Locations",
    fa: "مکان‌ها",
    ar: "المواقع",
    es: "Ubicaciones",
    fr: "Lieux",
    hi: "स्थान",
    de: "Standorte",
    pt: "Localizações",
    tr: "Konumlar",
    zh: "地区",
    ja: "勤務地",
    id: "Lokasi",
  },
  Categories: {
    en: "Categories",
    fa: "دسته‌بندی‌ها",
    ar: "الفئات",
    es: "Categorías",
    fr: "Catégories",
    hi: "श्रेणियाँ",
    de: "Kategorien",
    pt: "Categorias",
    tr: "Kategoriler",
    zh: "分类",
    ja: "職種カテゴリ",
    id: "Kategori",
  },
};

function label(key: string, locale?: string): string {
  if (!locale) return key;
  return BREADCRUMB_LABELS[key]?.[locale as Locale] || key;
}

export function jobBreadcrumbs(params: {
  jobTitle: string;
  jobId: string;
  companyName?: string | null;
  companyId?: string | null;
  locale?: string;
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
  locale?: string;
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
  locale?: string;
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
  locale?: string;
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
  locale?: string;
}): BreadcrumbItem[] {
  const loc = params.locale;
  return [
    { name: label("Home", loc), path: "/" },
    { name: label("Categories", loc), path: "/categories" },
    { name: params.name, path: `/categories/${params.slug}` },
  ];
}
