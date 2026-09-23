import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import { seedAtsBoards, summarizeAtsBoards, registerAtsBoard } from "@/lib/jobs/ingestion/ats-seeding";

/* ------------------------------------------------------------------ */
/* POST schemas                                                        */
/* ------------------------------------------------------------------ */

const seedSchema = z.object({
  action: z.literal("seed"),
});

const registerSchema = z
  .object({
    action: z.literal("register"),
    provider: z.enum(["greenhouse", "lever", "ashby"]),
    boardIdentifier: z.string().trim().min(1).max(200),
    companyName: z.string().trim().min(1).max(200),
    country: z.string().trim().max(80).optional(),
    language: z.string().trim().max(10).optional(),
  })
  .strict();

const updateSchema = z
  .object({
    action: z.literal("update"),
    id: z.string().min(1),
    status: z.enum(["discovered", "active", "paused", "blocked"]).optional(),
    legalStatus: z
      .enum(["APPROVED", "NEEDS_PERMISSION", "RESTRICTED", "DISABLED", "UNKNOWN"])
      .optional(),
    robotsStatus: z.enum(["allowed", "disallowed", "unknown"]).optional(),
    termsStatus: z.enum(["allowed", "restricted", "unknown"]).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.status !== undefined ||
      d.legalStatus !== undefined ||
      d.robotsStatus !== undefined ||
      d.termsStatus !== undefined,
    { message: "At least one field required" },
  );

const bodySchema = z.discriminatedUnion("action", [
  seedSchema,
  registerSchema,
  updateSchema,
]);

/* ------------------------------------------------------------------ */
/* GET — list + summary                                                */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_source_companies_get_${authz.user.id}_${ip}`,
    );
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const [rows, summary] = await Promise.all([
      db.sourceCompany.findMany({
        orderBy: [{ provider: "asc" }, { boardIdentifier: "asc" }],
        take: 2000,
      }),
      summarizeAtsBoards(),
    ]);

    return NextResponse.json({ summary, companies: rows });
  } catch (error) {
    console.error("Admin source-companies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source companies" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* POST — seed / register / update                                     */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return authz.response;

    const ip = getRequestIp(req);
    const { success } = await adminRatelimit.limit(
      `admin_source_companies_post_${authz.user.id}_${ip}`,
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

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    if (parsed.data.action === "seed") {
      const results = await seedAtsBoards();
      return NextResponse.json({ success: true, results });
    }

    if (parsed.data.action === "register") {
      const { action: _a, ...seed } = parsed.data;
      void _a;
      const result = await registerAtsBoard(seed);
      return NextResponse.json({ success: true, result });
    }

    // action === "update"
    const { action: _a, id, ...patch } = parsed.data;
    void _a;

    const existing = await db.sourceCompany.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.legalStatus !== undefined) data.legalStatus = patch.legalStatus;
    if (patch.robotsStatus !== undefined) data.robotsStatus = patch.robotsStatus;
    if (patch.termsStatus !== undefined) data.termsStatus = patch.termsStatus;

    const company = await db.sourceCompany.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error("Admin source-companies POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
