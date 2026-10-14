import { parseLocalePath } from "@/lib/i18n/locale-path";

/**
 * Route access classification used by the auth middleware (edge runtime).
 *
 * - "public":  visible to guests (no login required)
 * - "auth":    login/register pages (guests allowed; signed-in users are sent to /dashboard)
 * - "private": requires a signed-in user (guests are sent to /login)
 * - "none":    not a known app route → passed through so Next.js returns its 404
 *
 * Language prefixes (/fa/jobs, /de/pricing, ...) are removed before matching,
 * so a prefixed URL is classified exactly like its unprefixed counterpart.
 *
 * Matching is segment-aware: "/companies" never matches the "/company" prefix.
 *
 * IMPORTANT: every real page under src/app must be listed as public, auth or
 * private. src/lib/route-access.test.ts scans src/app and fails when a page is
 * not classified, so a new private page cannot silently become guest-visible.
 */

export const PUBLIC_PAGES: readonly string[] = [
  "/",
  "/jobs",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/companies",
  "/categories",
  "/locations",
  "/blog",
  "/search",
];

/** Public dynamic routes, e.g. /jobs/[id], /blog/[slug] */
export const PUBLIC_PREFIXES: readonly string[] = [
  "/jobs",
  "/companies",
  "/categories",
  "/locations",
  "/blog",
  // Token-based share links are viewable without an account (the share API
  // is unauthenticated too). Only the token-scoped page is public.
  "/career-risk/share",
];

export const AUTH_PAGES: readonly string[] = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/** Routes that require a signed-in user. Role checks happen in the auth callback. */
export const PRIVATE_PREFIXES: readonly string[] = [
  "/dashboard",
  "/employer",
  "/admin",
  "/settings",
  "/profile",
  "/company",
  "/app",
  "/auth",
  "/bootstrap-owner",
  "/career-risk",
  "/job-alerts",
  "/messages",
  "/my-applications",
  "/my-interviews",
  "/notifications",
  "/payment",
  "/resume-builder",
  "/saved-jobs",
];

export type RouteAccess = "public" | "auth" | "private" | "none";

/** True when `path` equals `prefix` or is nested under it (segment-aware). */
function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Removes a language prefix and any trailing slash (keeps "/"). */
export function normalizeRoutePath(pathname: string): string {
  const { pathname: stripped } = parseLocalePath(pathname || "/");
  if (stripped === "/") return "/";
  return stripped.replace(/\/+$/, "") || "/";
}

export function classifyRoute(pathname: string): RouteAccess {
  const path = normalizeRoutePath(pathname);

  if (
    PUBLIC_PAGES.includes(path) ||
    PUBLIC_PREFIXES.some((p) => matchesPrefix(path, p))
  ) {
    return "public";
  }
  if (AUTH_PAGES.includes(path)) return "auth";
  if (PRIVATE_PREFIXES.some((p) => matchesPrefix(path, p))) return "private";
  return "none";
}
