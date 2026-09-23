import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { adminRatelimit } from "@/lib/ratelimit";
import { getRequestIp } from "@/lib/client-ip";
import {
  seedAtsBoards,
  summarizeAtsBoards,
  registerAtsBoard,
} from "@/lib/jobs/ingestion/ats-seeding";

/* ------------------------------------------------------------------ */
/* POST schemas                                                        */
/*                                                                    */
/* Note: z.discriminatedUnion requires plain ZodObject members. We    */
/* therefore do NOT use .refine() on the update schema — the "at      */
/* least one field" rule is enforced inside the handler instead.      */
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
      .enum([
        "APPROVED",
        "NEEDS_PERMISSION",
        "RESTRICTED",
        "DISABLED",
        "UNKNOWN",
      ])
      .optional(),
    robotsStatus: z.enum(["allowed", "disallowed", "unknown"]).optional(),
    termsStatus: z.enum(["allowed", "restricted", "unknown"]).optional(),
  })
  .strict();

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
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
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
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.action === "seed") {
      const results = await seedAtsBoards();
      return NextResponse.json({ success: true, results });
    }

    if (parsed.data.action === "register") {
      const { action: _action, ...seed } = parsed.data;
      void _action;
      const result = await registerAtsBoard(seed);
      return NextResponse.json({ success: true, result });
    }

    /* action === "update" — enforce "at least one field" here. */
    const {
      action: _action,
      id,
      status,
      legalStatus,
      robotsStatus,
      termsStatus,
    } = parsed.data;
    void _action;

    if (
      status === undefined &&
      legalStatus === undefined &&
      robotsStatus === undefined &&
      termsStatus === undefined
    ) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: { _errors: ["At least one field required"] },
        },
        { status: 400 },
      );
    }

    const existing = await db.sourceCompany.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (legalStatus !== undefined) data.legalStatus = legalStatus;
    if (robotsStatus !== undefined) data.robotsStatus = robotsStatus;
    if (termsStatus !== undefined) data.termsStatus = termsStatus;

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
