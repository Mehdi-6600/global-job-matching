/**
 * HTTP layer tests — byte-aware response-size protection.
 *
 * These tests exercise the real readBodyWithCap path via a stubbed
 * global fetch. No network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "./http";

/* ------------------------------------------------------------------ */
/* Minimal Response builder                                          */
/* ------------------------------------------------------------------ */

function makeResponse(
  body: string,
  init: ResponseInit & { contentLength?: number } = {},
): Response {
  const bytes = new TextEncoder().encode(body);
  const headers = new Headers(init.headers);
  const lengthToReport = init.contentLength ?? bytes.byteLength;
  headers.set("content-length", String(lengthToReport));
  return new Response(body, { ...init, headers });
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchWithRetry — byte-aware response size", () => {
  it("accepts a small ASCII response", async () => {
    globalThis.fetch = vi.fn(async () =>
      makeResponse(JSON.stringify({ ok: true })),
    ) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 1024,
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBeUndefined();
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("accepts a response exactly at the byte limit", async () => {
    // 8 ASCII chars = 8 bytes
    const body = '{"a":"b"}';
    expect(new TextEncoder().encode(body).byteLength).toBe(9);

    globalThis.fetch = vi.fn(async () => makeResponse(body)) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 9,
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBeUndefined();
    expect(res.body).toBe(body);
  });

  it("rejects before reading when Content-Length exceeds the limit", async () => {
    globalThis.fetch = vi.fn(async () =>
      makeResponse("x".repeat(10_000), { contentLength: 10_000 }),
    ) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 100,
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBe(true);
    // Body is drained, not carried.
    expect(res.body).toBe("");
  });

  it("measures multi-byte UTF-8 correctly", async () => {
    // Persian text: each character is 2 bytes in UTF-8.
    // "سلام" = 4 characters = 8 bytes.
    const persian = "سلام";
    const bytes = new TextEncoder().encode(persian).byteLength;
    expect(bytes).toBe(8);

    globalThis.fetch = vi.fn(async () => {
      const r = new Response(persian);
      // Hide content-length so we exercise the post-read check.
      return r;
    }) as unknown as typeof fetch;

    // Set limit to 8 → exactly fits.
    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 8,
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBeUndefined();
    expect(res.body).toBe(persian);
  });

  it("truncates multi-byte UTF-8 at a character boundary", async () => {
    // 20 Persian chars × 2 bytes = 40 bytes.
    const persian = "ا".repeat(20);
    expect(new TextEncoder().encode(persian).byteLength).toBe(40);

    globalThis.fetch = vi.fn(async () => {
      // No content-length to force post-read check.
      return new Response(persian);
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 10, // 10 bytes = 5 Persian chars
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBe(true);
    // Must contain 5 characters, no broken half-character at the end.
    expect(res.body).toBe("ا".repeat(5));
    expect(new TextEncoder().encode(res.body).byteLength).toBe(10);
  });

  it("does not split a multi-byte character when the limit lands mid-char", async () => {
    // 3-byte character (e.g. U+4E2D, Chinese "中")
    const chinese = "中".repeat(10); // 30 bytes total
    expect(new TextEncoder().encode(chinese).byteLength).toBe(30);

    globalThis.fetch = vi.fn(async () => {
      return new Response(chinese);
    }) as unknown as typeof fetch;

    // Limit = 7 bytes → only 2 full characters fit (6 bytes).
    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 1,
      maxResponseBytes: 7,
    });

    expect(res.ok).toBe(true);
    expect(res.truncated).toBe(true);
    // Exactly 2 chars, no partial replacement char.
    expect(res.body).toBe("中中");
    expect(res.body.includes("\uFFFD")).toBe(false);
    expect(new TextEncoder().encode(res.body).byteLength).toBeLessThanOrEqual(7);
  });

  it("retries on 5xx and succeeds", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return new Response("err", { status: 503 });
      }
      return makeResponse('{"ok":true}');
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 3,
      baseDelayMs: 1,
    });

    expect(res.ok).toBe(true);
    expect(call).toBe(2);
  });

  it("does not retry on 400", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call += 1;
      return new Response("bad", { status: 400 });
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.test/api", {
      maxAttempts: 3,
      baseDelayMs: 1,
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("http_400");
    expect(call).toBe(1);
  });
});
