import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireOwner } from "@/lib/authz";
import { ROLES, isValidRole, isOwnerRole, normalizeRole } from "@/lib/roles";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { bumpSessionVersion } from "@/lib/session-version";

const patchSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum([
      ROLES.JOB_SEEKER,
      ROLES.EMPLOYER,
      ROLES.ADMIN,
      ROLES.OWNER,
    ]),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_users_get_${authz.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          planExpiresAt: true,
          createdAt: true,
          image: true,
        },
      }),
      db.user.count(),
    ]);

    return NextResponse.json({ users, total });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * Change a user's role.
 * - ADMIN can set JOB_SEEKER / EMPLOYER
 * - Only OWNER can set ADMIN or OWNER
 * - Cannot demote the last OWNER
 * - Bumps sessionVersion so old JWTs die
 */
export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_users_patch_${authz.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Elevating to ADMIN/OWNER requires OWNER
    if (
      (role === ROLES.ADMIN || role === ROLES.OWNER) &&
      !isOwnerRole(authz.user.role)
    ) {
      return NextResponse.json(
        { error: "Only OWNER can assign ADMIN or OWNER roles" },
        { status: 403 }
      );
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent removing the last OWNER
    if (
      normalizeRole(target.role) === ROLES.OWNER &&
      role !== ROLES.OWNER
    ) {
      const ownerCount = await db.user.count({
        where: { role: ROLES.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last OWNER" },
          { status: 409 }
        );
      }

      // Only OWNER may demote an OWNER
      if (!isOwnerRole(authz.user.role)) {
        return NextResponse.json(
          { error: "Only OWNER can change OWNER roles" },
          { status: 403 }
        );
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
        },
      });
      await bumpSessionVersion(userId, tx);
      return user;
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: "Role updated. User must re-login for session to refresh.",
    });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
