/**
 * Canonical site origin without trailing slash.
 * Prefer NEXT_PUBLIC_APP_URL in production.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "https://global-job-matching.vercel.app";

  return String(raw).trim().replace(/\/$/, "") || "https://global-job-matching.vercel.app";
}

/** Absolute URL for a path starting with / */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path) return base;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Short plain-text description for meta tags */
export function truncateMeta(text: string | null | undefined, max = 160): string {
  const raw = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trim()}…`;
}
