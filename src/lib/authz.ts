import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isAdminRole,
  isEmployerRole,
  normalizeRole,
  type Role,
} from "@/lib/roles";

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role | string;
};

export type AuthOk = {
  ok: true;
  user: AuthUser;
  session: Session;
};

export type AuthFail = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthOk | AuthFail;

function fail(status: number, error: string): AuthFail {
  return {
    ok: false,
    response: NextResponse.json({ error }, { status }),
  };
}

/**
 * Require a valid logged-in session with a user id.
 */
export async function requireSession(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return fail(401, "Unauthorized");
  }

  if ((session as { error?: string }).error === "SessionInvalidated") {
    return fail(401, "Session expired. Please sign in again.");
  }

  return {
    ok: true,
    session: session as Session,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role || "",
    },
  };
}

/**
 * Require ADMIN or OWNER.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireSession();
  if (!result.ok) return result;

  if (!isAdminRole(result.user.role)) {
    return fail(403, "Forbidden");
  }

  return result;
}

/**
 * Require EMPLOYER, ADMIN, or OWNER.
 */
export async function requireEmployer(): Promise<AuthResult> {
  const result = await requireSession();
  if (!result.ok) return result;

  if (!isEmployerRole(result.user.role)) {
    return fail(403, "Forbidden");
  }

  return result;
}

/**
 * Require OWNER only (dangerous operations).
 */
export async function requireOwner(): Promise<AuthResult> {
  const result = await requireSession();
  if (!result.ok) return result;

  const role = normalizeRole(result.user.role);
  if (role !== "OWNER") {
    return fail(403, "Owner only");
  }

  return result;
}
