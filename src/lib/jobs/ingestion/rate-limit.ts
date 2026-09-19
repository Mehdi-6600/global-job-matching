/**
 * In-process per-source rate limiter (no Redis).
 * Suitable for single-region Vercel cron — not a distributed lock.
 */

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

/** Returns true if the call is allowed under limitPerMinute. <=0 = unrestricted. */
export function tryAcquireSourceQuota(
  sourceKey: string,
  limitPerMinute: number | null | undefined,
): boolean {
  if (limitPerMinute == null || limitPerMinute <= 0) return true;

  const now = Date.now();
  const windowMs = 60_000;
  let b = buckets.get(sourceKey);
  if (!b || now - b.windowStart >= windowMs) {
    b = { windowStart: now, count: 0 };
    buckets.set(sourceKey, b);
  }
  if (b.count >= limitPerMinute) return false;
  b.count += 1;
  return true;
}

/** Test helper */
export function _resetRateLimitBuckets(): void {
  buckets.clear();
}
