/**
 * Provider HTTP: timeout, exponential backoff, Retry-After, no secret logging.
 * redirect: "error" reduces SSRF surface.
 * maxResponseBytes caps memory use from a misbehaving provider.
 */

export type FetchRetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Max bytes for the response body.
   * - If content-length exceeds this, reject before reading the body.
   * - If the body exceeds this despite missing/lying content-length, truncate.
   * Default: 5 MB.
   */
  maxResponseBytes?: number;
};

export type FetchRetryResult = {
  ok: boolean;
  status: number;
  body: string;
  attempts: number;
  error?: string;
  /** True if body was truncated due to maxResponseBytes. */
  truncated?: boolean;
};

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const NO_RETRY = new Set([400, 401, 403, 404, 422]);

const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.min(asInt * 1000, 60_000);
  }
  const when = Date.parse(header);
  if (!Number.isNaN(when)) {
    return Math.min(Math.max(0, when - Date.now()), 60_000);
  }
  return null;
}

/**
 * Read the response body with a hard byte cap.
 *
 * Prefers Content-Length when present to bail out early; otherwise
 * falls back to a post-read length check. In both cases the returned
 * string never exceeds `maxBytes` (truncated if necessary).
 */
async function readBodyWithCap(
  res: Response,
  maxBytes: number,
): Promise<{ body: string; truncated: boolean }> {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      // We still need to drain the body to free the connection.
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return { body: "", truncated: true };
    }
  }

  const text = await res.text();
  if (text.length > maxBytes) {
    return { body: text.slice(0, maxBytes), truncated: true };
  }
  return { body: text, truncated: false };
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<FetchRetryResult> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 8_000;
  const maxResponseBytes =
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  let attempts = 0;
  let lastError = "";

  while (attempts < maxAttempts) {
    attempts += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...(options.headers || {}) },
        signal: controller.signal,
        redirect: "error",
      });

      const { body, truncated } = await readBodyWithCap(res, maxResponseBytes);

      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          body,
          attempts,
          truncated: truncated || undefined,
        };
      }

      if (NO_RETRY.has(res.status) || attempts >= maxAttempts) {
        return {
          ok: false,
          status: res.status,
          body: body.slice(0, 2000),
          attempts,
          error: `http_${res.status}`,
          truncated: truncated || undefined,
        };
      }

      if (!RETRYABLE.has(res.status)) {
        return {
          ok: false,
          status: res.status,
          body: body.slice(0, 2000),
          attempts,
          error: `http_${res.status}`,
          truncated: truncated || undefined,
        };
      }

      lastError = `http_${res.status}`;
      const retryAfter = parseRetryAfterMs(res.headers.get("retry-after"));
      const backoff = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, attempts - 1),
      );
      await sleep(retryAfter ?? backoff);
      continue;
    } catch (e) {
      lastError =
        e instanceof Error
          ? e.name === "AbortError"
            ? "timeout"
            : e.message.slice(0, 200)
          : "network";
      if (attempts >= maxAttempts) {
        return { ok: false, status: 0, body: "", attempts, error: lastError };
      }
      await sleep(
        Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempts - 1)),
      );
      continue;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  return {
    ok: false,
    status: 0,
    body: "",
    attempts,
    error: lastError || "exhausted",
  };
}
