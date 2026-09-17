import type { RateLimitInfo } from "@/lib/http";

/**
 * قرارداد حداقلی برای یک Rate Limiter.
 * هر limiter باید متد `limit` را ارائه دهد که یک کلید می‌گیرد
 * و نتیجه‌ی محدودیت را برمی‌گرداند.
 */
type Limiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
  }>;
};

/**
 * نتیجه‌ی strictAiLimit.
 * علاوه بر اطلاعات استاندارد RateLimitInfo، دو فلگ تشخیصی هم دارد:
 */
export type StrictLimitResult = RateLimitInfo & {
  /** فقط زمانی true است که هم Redis و هم fallback حافظه شکست خورده باشند (نادر). */
  infraFailed?: boolean;
  /** زمانی true است که Redis خطا داده و از limiter محلی حافظه استفاده شده. */
  degraded?: boolean;
};

/**
 * ساخت یک Rate Limiter محلی (در حافظه‌ی پروسه) برای مواقعی که Upstash
 * در زمان اجرا خطا می‌دهد.
 *
 * @param max      حداکثر تعداد درخواست مجاز در پنجره
 * @param windowMs طول پنجره به میلی‌ثانیه
 */
function createMemoryLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit(key: string) {
      const now = Date.now();
      const row = hits.get(key);

      // پنجره منقضی شده یا کلید جدید → شمارنده را ریست کن.
      if (!row || now > row.resetAt) {
        const resetAt = now + windowMs;
        hits.set(key, { count: 1, resetAt });
        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: resetAt,
        };
      }

      // سقف مصرف reached → رد کن.
      if (row.count >= max) {
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset: row.resetAt,
        };
      }

      // در غیر این صورت یک واحد مصرف کن.
      row.count += 1;
      hits.set(key, row);
      return {
        success: true,
        limit: max,
        remaining: max - row.count,
        reset: row.resetAt,
      };
    },
  };
}

/**
 * limiter حافظه‌ای مخصوص AI: ۳ درخواست در دقیقه.
 * این به‌عنوان fallback زمانی که Redis/Upstash در دسترس نیست استفاده می‌شود.
 */
const memoryAiFallback = createMemoryLimiter(3, 60_000);

/**
 * نسخه‌ی Fail-Open برای مسیرهای ارزان و UX-محور
 * (مثل لیست‌های ورود، خواندن‌های غیر-AI).
 *
 * در صورت خطای limiter، درخواست را مجاز می‌کند.
 * هرگز برای تولید AI گران/پرداختی استفاده نکن.
 */
export async function safeLimit(
  limiter: Limiter,
  key: string
): Promise<RateLimitInfo> {
  try {
    const result = await limiter.limit(key);
    return {
      success: result.success !== false,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[safeLimit] limiter failed, allowing request:", error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
    };
  }
}

/**
 * Rate Limit سخت‌گیرانه برای مسیرهای AI:
 * Redis به‌عنوان لایه‌ی اصلی + fallback حافظه‌ای.
 *
 * رفتار قبلی: خطای Redis → infraFailed → پاسخ HTTP 503 در Career Risk.
 * این باعث می‌شد حتی وقتی DB/AI سالم بودند، پیام
 * "Service temporarily unavailable" برگردد.
 *
 * رفتار جدید:
 * 1) تلاش برای limiter اصلی (Redis/Upstash)
 * 2) در صورت خطا → limiter حافظه‌ای (همچنان ۳/دقیقه به‌ازای هر نمونه)
 * 3) فقط اگر حافظه هم خطا داد → infraFailed (caller می‌تواند به heuristic تنزل کند)
 */
export async function strictAiLimit(
  limiter: Limiter,
  key: string
): Promise<StrictLimitResult> {
  try {
    const result = await limiter.limit(key);
    return {
      success: result.success !== false,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      infraFailed: false,
      degraded: false,
    };
  } catch (error) {
    // Redis/Upstash خطا داد → از fallback حافظه استفاده کن.
    console.error(
      "[strictAiLimit] Redis/Upstash failed — using memory fallback:",
      error instanceof Error
        ? error.message.slice(0, 200)
        : String(error).slice(0, 200)
    );

    try {
      const result = await memoryAiFallback.limit(key);
      return {
        success: result.success !== false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        infraFailed: false,
        degraded: true,
      };
    } catch (memErr) {
      // حتی fallback حافظه هم خطا داد → infraFailed.
      console.error("[strictAiLimit] memory fallback failed:", memErr);
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60_000,
        infraFailed: true,
        degraded: true,
      };
    }
  }
}
