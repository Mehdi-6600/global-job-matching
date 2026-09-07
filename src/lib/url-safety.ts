/**
 * SSRF-oriented URL checks for user/external-supplied URLs.
 * Host-only checks; callers must also use redirect: "error" on fetch.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80")) return true;
  return false;
}

export function isSafePublicHttpUrl(
  raw: string | null | undefined,
  options?: { allowHttp?: boolean }
): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 2000) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol === "https:") {
    // ok
  } else if (protocol === "http:" && options?.allowHttp) {
    // ok
  } else {
    return false;
  }

  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) return false;

  return true;
}

/** Safe internal path only (open-redirect protection) */
export function isSafeRelativeCallback(
  path: string | null | undefined
): boolean {
  if (!path || typeof path !== "string") return false;
  const p = path.trim();
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (p.includes("\\")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return false;
  return p.length <= 500;
}

export function safeCallbackOr(
  path: string | null | undefined,
  fallback = "/"
): string {
  return isSafeRelativeCallback(path) ? (path as string) : fallback;
}
