import type { NextRequest } from "next/server";

/**
 * Best-effort client IP on Vercel.
 * Prefer platform headers; do not trust a lone client-supplied header.
 */
export function getRequestIp(
  req: Request | NextRequest,
  fallback = "unknown"
): string {
  const h = req.headers;

  // Vercel injects this from the edge — prefer over generic XFF
  const vercelFwd = h.get("x-vercel-forwarded-for");
  if (vercelFwd) {
    const first = vercelFwd.split(",")[0]?.trim();
    if (first && isPlausibleIp(first)) return first;
  }

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp && isPlausibleIp(realIp)) return realIp;

  // Last resort: first hop of x-forwarded-for (may be spoofed outside Vercel)
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && isPlausibleIp(first)) return first;
  }

  return fallback;
}

function isPlausibleIp(value: string): boolean {
  // Basic IPv4 / IPv6 shape check — reject empty / obvious garbage
  if (value.length < 3 || value.length > 45) return false;
  if (/\s/.test(value)) return false;
  return true;
}
