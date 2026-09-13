import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * Next.js generateSitemaps does not serve a working /sitemap.xml index on this deploy.
 * Canonical index is /sitemaps.xml — permanent redirect for crawlers & Search Console defaults.
 */
export function GET() {
  const base = getSiteUrl().replace(/\/$/, "");
  return NextResponse.redirect(`${base}/sitemaps.xml`, 308);
}
