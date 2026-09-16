import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";
import { securityLog } from "@/lib/security-log";
import { z } from "zod";
import { normalizeLocation } from "@/lib/location";
import { jobStatusSchema } from "@/lib/validation/job";
import { readJsonBody } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_TAKE = 100;
const MAX_TAKE = 500;
const MIN_TAKE = 1;
const MAX_ID_LENGTH = 64;
const MAX_QUERY_LENGTH = 200;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

const adminJobUpdateSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(20).max(20_000).optional(),
    location: z.string().trim().min(2).max(200).optional(),
    salary: z.string().trim().max(100).nullable().optional(),
    type: z.string().trim().min(1).max(50).optional(),
    status: jobStatusSchema.optional(),
  })
  .strict();

export type AdminJobUpdateInput = z.infer<typeof adminJobUpdateSchema>;

const listQuerySchema = z.object({
  take: z.coerce
    .number()
    .int()
    .min(MIN_TAKE)
    .max(MAX_TAKE)
    .catch(DEFAULT_TAKE),
  skip: z.coerce.number().int().min(0).catch(0),
  status: jobStatusSchema.optional(),
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH).optional(),
});

const jobIdSchema = z.string().min(1).max(MAX_ID_LENGTH);

type JsonErrorBody = { error: string; details?: unknown };

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
};

function jsonError(
  error: string,
  status: number,
  details?: unknown
): NextResponse<JsonErrorBody> {
  return NextResponse.json(
    details !== undefined ? { error, details } : { error },
    { status, headers: NO_STORE_HEADERS }
  );
}

function jsonOk<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function isPrismaError(
  error: unknown,
  code?: string
): error is PrismaLikeError {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error)) return false;
  const err = error as PrismaLikeError;
  return code === undefined || err.code === code;
}

function flattenFieldErrors(
  error: z.ZodError
): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}

/** Best-effort security log — never disrupts the main request flow. */
function safeSecurityLog(
  event: Parameters<typeof securityLog>[0],
  payload: Parameters<typeof securityLog>[1]
): void {
  try {
    securityLog(event, payload);
  } catch (err) {
    console.error("[admin/jobs] securityLog failed:", err);
  }
}

type AdminGuardResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse<JsonErrorBody> };

async function requireAdminWithRateLimit(
  req: NextRequest
): Promise<AdminGuardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  if (!isAdminRole(session.user.role)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  const ip = getRequestIp(req);
  const limited = await ratelimit.limit(
    `admin_jobs_${session.user.id}_${ip}`
  );

  if (!limited.success) {
    return { ok: false, response: jsonError("Too many requests", 429) };
  }

  return {
    ok: true,
    userId: session.user.id,
    role: session.user.role as string,
  };
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

const DEFAULT_TAKE = 100;
const MAX_TAKE = 500;
const MIN_TAKE = 1;
const MAX_ID_LENGTH = 64;
const MAX_QUERY_LENGTH = 200;

const adminJobUpdateSchema = z
  .object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(20).max(20_000).optional(),
    location: z.string().trim().min(2).max(200).optional(),
    salary: z.string().trim().max(100).nullable().optional(),
    type: z.string().trim().min(1).max(50).optional(),
    status: jobStatusSchema.optional(),
  })
  .strict();

export type AdminJobUpdateInput = z.infer<typeof adminJobUpdateSchema>;

const listQuerySchema = z.object({
  take: z.coerce
    .number()
    .int()
    .min(MIN_TAKE)
    .max(MAX_TAKE)
    .catch(DEFAULT_TAKE),
  skip: z.coerce.number().int().min(0).catch(0),
  status: jobStatusSchema.optional(),
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_TAKE_DUP = 100; // keep schema above as source of truth
EOF
