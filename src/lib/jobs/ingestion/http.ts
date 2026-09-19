/**
 * Provider HTTP helper: timeout + exponential backoff.
 * Never logs secrets. redirect: "error" reduces SSRF surface.
 */

export type FetchRetryOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export type FetchRetryResult = {
  ok: boolean;
  status: number;
  body: string;
  attempts: number;
  error?: string;
};

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<FetchRetryResult> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
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
      const body = await res.text();

      if (res.ok) {
        return { ok: true, status: res.status, body, attempts };
      }

      if (!RETRYABLE.has(res.status) || attempts >= maxAttempts) {
        return {
          ok: false,
          status: res.status,
          body: body.slice(0, 2000),
          attempts,
          error: `http_${res.status}`,
        };
      }
      lastError = `http_${res.status}`;
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
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }

    await sleep(baseDelayMs * Math.pow(2, attempts - 1));
  }

  return { ok: false, status: 0, body: "", attempts, error: lastError || "exhausted" };
}
