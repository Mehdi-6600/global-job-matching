import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeLocation } from "@/lib/location";
import { createJobForUser } from "@/services/jobs/create-job";
import { getRequestIp } from "@/lib/client-ip";
import { ratelimit } from "@/lib/ratelimit";

// ---------------------------------------------------------------------------
// پیکربندی مسیر (Next.js App Router)
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------------------------------------------------------------------
// ثابت‌ها
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 100_000; // 100 KB

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
} as const;

/**
 * این مسیر legacy است و ممکن است در آینده حذف شود.
 * هدرهای Deprecation/Link به مصرف‌کننده‌ها هشدار می‌دهند.
 * اگر تاریخ حذف مشخص است، هدر Sunset را هم اضافه کنید:
 *   Sunset: "Wed, 31 Dec 2026 23:59:59 GMT"
 */
const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Link: '</api/employer/jobs>; rel="successor-version"',
} as const;

const RESPONSE_HEADERS = {
  ...NO_STORE_HEADERS,
  ...DEPRECATION_HEADERS,
} as const;

// ---------------------------------------------------------------------------
// تایپ‌ها
// ---------------------------------------------------------------------------

type JsonErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
  limit?: number;
  used?: number;
};

// ---------------------------------------------------------------------------
// Helperها
// ---------------------------------------------------------------------------

function jsonResponse<T>(
  body: T,
  status = 200,
  extraHeaders?: Record<string, string>
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { ...RESPONSE_HEADERS, ...extraHeaders },
  });
}

function jsonError(
  error: string,
  status: number,
  extra?: Partial<Omit<JsonErrorBody, "error">>
): NextResponse<JsonErrorBody> {
  return jsonResponse({ error, ...extra }, status);
}

/**
 * خواندن بدنه‌ی JSON با محدودیت اندازه برای جلوگیری از DoS.
 * - اگر `Content-Length` از حد مجاز بیشتر باشد → null
 * - اگر متن بیش از حد مجاز باشد → null
 * - اگر JSON نامعتبر باشد → null
 */
async function readJsonBodySafe(
  req: NextRequest,
  maxBytes = MAX_BODY_BYTES
): Promise<unknown | null> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const len = Number(contentLength);
    if (!Number.isFinite(len) || len < 0) return null;
    if (len > maxBytes) return null;
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }

  if (text.length > maxBytes) return null;
  if (text.trim().length === 0) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/jobs  (Legacy)
// ---------------------------------------------------------------------------

/**
 * مسیر قدیمی برای ساخت job.
 *
 * ⚠️ این مسیر نباید چک‌های پلن یا ownership را دور بزند.
 * مسیر پیشنهادی: `POST /api/employer/jobs`
 */
export async function POST(req: NextRequest) {
  try {
    // 1) احراز هویت
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    // 2) Rate limit
    const ip = getRequestIp(req);
    const { success } = await ratelimit.limit(
      `jobs_create_${session.user.id}_${ip}`
    );
    if (!success) {
      return jsonError("Too many requests", 429);
    }

    // 3) خواندن بدنه با محدودیت اندازه
    const body = await readJsonBodySafe(req);
    if (body === null) {
      return jsonError("Invalid JSON body", 400);
    }

    // 4) فراخوانی سرویس (شامل چک‌های پلن و ownership)
    const result = await createJobForUser(
      {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
      },
      body
    );

    // 5) مدیریت خطای دامنه
    if (!result.ok) {
      // برای خطاهای 5xx، جزئیات حساس را افشا نکن
      const isServerError = result.status >= 500;

      return jsonError(result.error, result.status, {
        code: result.code,
        details: isServerError ? undefined : result.details,
        limit: isServerError ? undefined : result.limit,
        used: isServerError ? undefined : result.used,
      });
    }

    // 6) پاسخ موفق
    const job = result.job;
    return jsonResponse({
      success: true,
      job: {
        ...job,
        location: normalizeLocation(job.location) || job.location,
      },
    });
  } catch (error) {
    console.error("[jobs/create] POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// سایر متدها → 405
// ---------------------------------------------------------------------------

function methodNotAllowed(): NextResponse<JsonErrorBody> {
  return jsonError("Method not allowed. Use POST.", 405, {
    code: "METHOD_NOT_ALLOWED",
  });
}

export async function GET() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
