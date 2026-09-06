import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";

const patchSchema = z
  .object({
    id: z.string().min(1),
    isActive: z.boolean().optional(),
    verified: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.isActive !== undefined || d.verified !== undefined, {
    message: "At least one field required",
  });

export async function GET(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_companies_get_${authz.user.id}_${ip}`
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const companies = await db.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { jobs: true } },
      },
    });

    return NextResponse.json({ companies, count: companies.length });
  } catch (error) {
    console.error("Admin companies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_companies_patch_${authz.user.id}_${ip}`
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

    const { id, isActive, verified } = parsed.data;

    const existing = await db.company.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Only set fields that exist on the schema — avoid crashing if optional columns differ
    const data: Record<string, boolean> = {};
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof verified === "boolean") data.verified = verified;

    try {
      const company = await db.company.update({
        where: { id },
        data,
      });
      return NextResponse.json({ success: true, company });
    } catch (e) {
      // Fallback: some deployments may not have isActive/verified columns
      console.error("Admin company update failed:", e);
      return NextResponse.json(
        {
          error:
            "Could not update company. Ensure isActive/verified columns exist in schema.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Admin companies PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
