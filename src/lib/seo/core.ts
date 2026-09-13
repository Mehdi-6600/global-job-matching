import type { Metadata } from "next";
import { absoluteUrl, getSiteUrl, truncateMeta } from "@/lib/site-url";
import { buildHreflangLanguages } from "@/lib/seo/hreflang";
import { defaultLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/locale-path";
import { toOgLocale } from "@/lib/i18n/og-locale";
import type { Locale } from "@/lib/i18n/config";

export { absoluteUrl, getSiteUrl, truncateMeta };

/** Default social card (Next.js ImageResponse route) */
export const DEFAULT_OG_PATH = "/opengraph-image";

export function stripHtml(text: string | null | undefined): string {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map free-text employment type to schema.org / Google JobPosting values */
export function toSchemaEmploymentType(
  raw: string | null | undefined
): string {
  const t = String(raw || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

  if (!t) return "FULL_TIME";
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("contract") || t.includes("freelance")) return "CONTRACTOR";
  if (t.includes("temp") || t.includes("temporary")) return "TEMPORARY";
  if (t.includes("intern")) return "INTERN";
  if (t.includes("volunteer")) return "VOLUNTEER";
  if (t.includes("full")) return "FULL_TIME";
  return "OTHER";
}

export function buildPublicMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  index?: boolean;
  type?: "website" | "article" | "profile";
  /** Content language for OG; default en */
  locale?: Locale;
  /** Include hreflang alternates (default true for public pages) */
  hreflang?: boolean;
}): Metadata {
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const locale = opts.locale || defaultLocale;
  const canonicalPath = localizePath(path, locale);
  const url = absoluteUrl(canonicalPath);
  const image =
    opts.image && /^https?:\/\//i.test(opts.image)
      ? opts.image
      : absoluteUrl(DEFAULT_OG_PATH);
  const index = opts.index !== false;
  const withHreflang = opts.hreflang !== false && index;

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: url,
      ...(withHreflang
        ? { languages: buildHreflangLanguages(path) }
        : {}),
    },
    openGraph: {
      type: opts.type || "website",
      url,
      locale: toOgLocale(locale),
      title: opts.title,
      description: opts.description,
      siteName: "Global Job Matching",
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
