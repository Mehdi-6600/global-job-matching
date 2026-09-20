/**
 * Provider HTTP: timeout, exponential backoff, Retry-After, no secret logging.
 * redirect: "error" reduces SSRF surface.
 * maxResponseBytes caps memory use from a misbehaving provider.
 *
 * Size limit is byte-aware (UTF-8), not character-aware. A response that
 * is under the limit in ASCII characters may still exceed it in bytes
 * for non-Latin scripts; we measure the true byte length before deciding
 * to truncate.
 */

export type FetchRetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Max bytes for the response body (UTF-8).
   * - If Content-Length exceeds this, the response is rejected before
   *   reading the body.
   * - If the actual body exceeds this despite a missing/lying
   *   Content-Length, it is truncated at a UTF-8 boundary.
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
 * Truncate a UTF-8 string so its encoded byte length does not exceed
 * `maxBytes`. Never splits a multi-byte character: if the cut would
 * land mid-character, we back off to the previous character boundary.
 *
 * Falls back to a conservative binary search when the simple bound is
 * insufficient.
 */
function truncateUtf8(text: string, maxBytes: number): string {
  // Fast path: ASCII-only strings have 1 byte per character.
  // eslint-disable-next-line no-control-regex
  if (/^[\u0000-\u007F]*$/.test(text)) {
    return text.slice(0, maxBytes);
  }

  // Encode to UTF-8 bytes, then cut at a safe boundary.
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  if (bytes.byteLength <= maxBytes) return text;

  // Slice the byte buffer, then decode with fatal=false so a partial
  // character at the end becomes the replacement char (U+FFFD), which
  // we then strip.
  const cut = bytes.slice(0, maxBytes);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let decoded = decoder.decode(cut);

  // Remove any trailing replacement character introduced by cutting
  // through a multi-byte sequence.
  while (decoded.endsWith("\uFFFD")) {
    decoded = decoded.slice(0, -1);
  }
  return decoded;
}

/**
 * Read the response body with a hard byte cap (UTF-8).
 *
 * Prefers Content-Length when present to bail out early; otherwise
 * falls back to a post-read byte-length check. In both cases the
 * returned string's UTF-8 byte length never exceeds `maxBytes`.
 */
async function readBodyWithCap(
  res: Response,
  maxBytes: number,
): Promise<{ body: string; truncated: boolean }> {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      // Drain the body to free the connection without keeping it in memory.
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return { body: "", truncated: true };
    }
  }

  const text = await res.text();

  // Byte-aware measurement.
  const actualBytes = new TextEncoder().encode(text).byteLength;
  if (actualBytes > maxBytes) {
    return { body: truncateUtf8(text, maxBytes), truncated: true };
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
