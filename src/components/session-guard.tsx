"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

/**
 * Watches the NextAuth session for the `SessionInvalidated` flag.
 *
 * Why this exists:
 *   When a user's `sessionVersion` is bumped (password change, admin ban,
 *   email change that invalidates sessions, etc.), the jwt callback marks
 *   the token with `error: "SessionInvalidated"`. The session callback then
 *   returns a user object with empty `id`/`role` and an `error` field.
 *
 * Without this guard, the UI stays in a limbo state: the navbar thinks the
 * user is logged in (`status === "authenticated"` and `session` is truthy),
 * but every API call returns 401. The user sees broken pages with no clear
 * recovery path.
 *
 * What it does:
 *   - Detects `session.error === "SessionInvalidated"`
 *   - Clears the stale client session via `signOut({ redirect: false })`
 *   - Redirects to `/login?error=SessionExpired&callbackUrl=<current>`
 *
 * Guard rails:
 *   - Does NOT redirect if the user is already on /login or /register
 *   - Fires at most once per mount (ref guard prevents loops)
 *   - Never throws — a failed signOut still leaves the user on a safe path
 */
export function SessionGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const handledRef = useRef(false);

  useEffect(() => {
    // Wait until NextAuth has resolved.
    if (status !== "authenticated") {
      return;
    }

    const error = (session as { error?: string } | null)?.error;
    const userId = session?.user?.id;

    const invalidated =
      error === "SessionInvalidated" || (!userId && error !== undefined);

    if (!invalidated) {
      return;
    }

    // Avoid loops and double-handling.
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    // Don't bounce the user off auth pages they're already on.
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return;
    }

    const callbackUrl =
      pathname + (typeof window !== "undefined" ? window.location.search : "");

    // Fire-and-forget: clearing the cookie is best-effort.
    void signOut({ redirect: false })
      .catch(() => {
        /* ignore — we still want the redirect below */
      })
      .finally(() => {
        const target = new URL("/login", window.location.origin);
        target.searchParams.set("error", "SessionExpired");
        if (callbackUrl && callbackUrl !== "/") {
          target.searchParams.set("callbackUrl", callbackUrl);
        }
        router.replace(target.pathname + "?" + target.searchParams.toString());
      });
  }, [status, session, pathname, router]);

  return null;
}
