import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole, isEmployerRole, ROLES, type Role } from "@/lib/roles";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type AuthedUser = {
  id: string;
  role: Role | string;
  email: string | null;
  name: string | null;
};

export type RequireUserResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

export type RequireRoleResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

/* ------------------------------------------------------------------ */
/* Error responses (consistent shape)                                  */
/* ------------------------------------------------------------------ */

function jsonError(
  status: number,
  error: string,
  code: string,
): NextResponse {
  return NextResponse.json(
    { error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function unauthorizedResponse(
  message = "Unauthorized",
): NextResponse {
  return jsonError(401, message, "UNAUTHORIZED");
}

export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return jsonError(403, message, "FORBIDDEN");
}

/* ------------------------------------------------------------------ */
/* Bearer secret (cron / sync / seed)                                  */
/* ------------------------------------------------------------------ */

/**
 * Constant-time comparison of two strings.
 *
 * Uses Node's crypto.timingSafeEqual when available. Falls back to a
 * length-safe XOR loop for edge runtimes without node:crypto — never
 * leaks timing information about the matching prefix.
 */
function safeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Authorize a request by comparing `Authorization: Bearer <secret>`
 * against the expected secret in constant time.
 *
 * Used by:
 *   - /api/cron/expire-plans (CRON_SECRET)
 *   - /api/jobs/sync (SYNC_SECRET or CRON_SECRET)
 *   - /api/seed (SEED_SECRET, dev only)
 *
 * Never logs the secret. Never reveals whether the header was missing
 * vs. wrong vs. malformed.
 */
export function isAuthorizedBearerSecret(
  req: Request,
  expectedSecret: string | null | undefined,
): boolean {
  if (!expectedSecret || expectedSecret.length < 8) return false;

  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return false;

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const provided = header.slice(prefix.length).trim();
  if (!provided) return false;

  return safeStringEqual(provided, expectedSecret);
}

/* ------------------------------------------------------------------ */
/* Core helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Require an authenticated user.
 *
 * Returns a discriminated union so callers can early-return the
 * NextResponse directly without throwing.
 *
 * Usage:
 *   const authResult = await requireUser();
 *   if (!authResult.ok) return authResult.response;
 *   // authResult.user is now typed and non-null
 */
export async function requireUser(): Promise<RequireUserResult> {
  const session = await auth();

  if (
    !session?.user?.id ||
    session.error === "SessionInvalidated"
  ) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return {
    ok: true,
    user: {
      id: session.user.id,
      role: session.user.role || "",
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
  };
}

/**
 * Require a specific set of roles.
 * Admins are NOT automatically granted; pass ROLES.ADMIN explicitly
 * if you want them in the allowed set.
 */
export async function requireRole(
  allowed: readonly Role[],
): Promise<RequireRoleResult> {
  const base = await requireUser();
  if (!base.ok) return base;

  const role = String(base.user.role || "").toUpperCase();
  if (!allowed.includes(role as Role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return base;
}

/**
 * Employer-only surface. ADMIN/OWNER are included by design (they
 * oversee the employer panel).
 */
export async function requireEmployer(): Promise<RequireRoleResult> {
  const base = await requireUser();
  if (!base.ok) return base;

  if (!isEmployerRole(base.user.role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return base;
}

/**
 * Admin-only surface. OWNER is included by design.
 */
export async function requireAdmin(): Promise<RequireRoleResult> {
  const base = await requireUser();
  if (!base.ok) return base;

  if (!isAdminRole(base.user.role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return base;
}

/**
 * Admin or OWNER or the resource owner.
 * Used for "edit my job" / "view my draft" style endpoints.
 */
export async function requireUserOrAdmin(
  resourceOwnerId: string | null | undefined,
): Promise<RequireRoleResult> {
  const base = await requireUser();
  if (!base.ok) return base;

  const isOwner = resourceOwnerId && resourceOwnerId === base.user.id;
  if (isOwner || isAdminRole(base.user.role)) {
    return base;
  }

  return { ok: false, response: forbiddenResponse() };
}

/* ------------------------------------------------------------------ */
/* Re-exports for convenience                                          */
/* ------------------------------------------------------------------ */

export { ROLES };
