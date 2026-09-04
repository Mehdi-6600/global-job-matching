import type { NextRequest } from "next/server";

/**
 * Best-effort client IP on Vercel.
 * Prefer platform headers over spoofable x-forwarded-for alone.
 */
export function getRequestIp(
  req: Request | NextRequest,
  fallback = "unknown"
): string {
  const h = req.headers;

  const vercelFwd = h.get("x-vercel-forwarded-for");
  if (vercelFwd) {
    const first = vercelFwd.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return fallback;
}
