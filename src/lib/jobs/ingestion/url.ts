/**
 * Safe URL normalization for dedup / apply links.
 * Never invents URLs. Preserves signed query params.
 */

const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

function looksSigned(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    const k = key.toLowerCase();
    if (
      k.includes("signature") ||
      k.includes("token") ||
      k === "sig" ||
      k === "hmac" ||
      k === "expires" ||
      k === "x-amz-signature"
    ) {
      return true;
    }
  }
  return false;
}

export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Normalize for comparison/storage. Returns null if invalid. */
export function normalizeJobUrl(
  value: string | null | undefined,
): string | null {
  if (!value || !isValidHttpUrl(value)) return null;
  try {
    const u = new URL(value.trim());
    u.hash = "";
    if (!looksSigned(u.searchParams)) {
      for (const p of [...u.searchParams.keys()]) {
        if (STRIP_PARAMS.has(p.toLowerCase())) u.searchParams.delete(p);
      }
    }
    u.hostname = u.hostname.toLowerCase();
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") {
      out = out.slice(0, -1);
    }
    return out;
  } catch {
    return null;
  }
}
