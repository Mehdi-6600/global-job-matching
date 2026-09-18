import type { NextRequest } from "next/server";

/**
 * Best-effort client IP on Vercel.
 * Prefer platform headers; do not trust a lone client-supplied header in isolation.
 * Single source of truth for rate-limit / abuse keys across API routes.
 */
export function getRequestIp(
  req: Request | NextRequest,
  fallback = "unknown"
): string {
  const h = req.headers;

  // Vercel injects this from the edge — prefer over generic XFF
  const vercelFwd = h.get("x-vercel-forwarded-for");
  if (vercelFwd) {
    const first = firstHop(vercelFwd);
    if (first && isPlausibleIp(first)) return first;
  }

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp && isPlausibleIp(realIp)) return realIp;

  // Last resort: first hop of x-forwarded-for (may be spoofed outside Vercel)
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = firstHop(xff);
    if (first && isPlausibleIp(first)) return first;
  }

  return fallback;
}

function firstHop(headerValue: string): string {
  return headerValue.split(",")[0]?.trim() ?? "";
}

function isPlausibleIp(value: string): boolean {
  const v = value.trim();
  if (v.length < 3 || v.length > 45) return false;
  if (/\s/.test(v)) return false;
  if (v.toLowerCase() === "unknown" || v === "null" || v === "undefined") {
    return false;
  }
  // Reject obvious non-IP tokens (no digit and no colon → not IPv4/IPv6-ish)
  if (!/[0-9]/.test(v) && !v.includes(":")) return false;
  return true;
}
