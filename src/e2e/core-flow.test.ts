/**
 * Core API smoke / e2e-style flow against a running deployment.
 *
 * Run:
 *   E2E_BASE_URL=https://global-job-matching.vercel.app npm test -- src/e2e/core-flow.test.ts
 *
 * Without E2E_BASE_URL this suite is skipped (so local CI without a live URL still passes).
 */

import { describe, it, expect } from "vitest";

const BASE = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");
const run = BASE.length > 0;

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

describe.skipIf(!run)("core flow against live site", () => {
  it("health is ok", async () => {
    const { res, body } = await json("/api/health");
    expect(res.status).toBe(200);
    expect(body.status === "ok" || body.ok === true || body.status).toBeTruthy();
  });

  it("jobs list is paginated", async () => {
    const { res, body } = await json("/api/jobs?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(body.pagination).toBeTruthy();
    expect(body.pagination.limit).toBeLessThanOrEqual(100);
  });

  it("register rejects invalid body with 400", async () => {
    const { res, body } = await json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "1" }),
    });
    expect(res.status).toBe(400);
    expect(typeof body.error).toBe("string");
  });

  it("apply without session returns 401", async () => {
    const { res, body } = await json("/api/applications", {
      method: "POST",
      body: JSON.stringify({ jobId: "cuidplaceholder000000000" }),
    });
    expect(res.status).toBe(401);
    expect(typeof body.error).toBe("string");
  });

  it("crypto payment without session returns 401", async () => {
    const { res, body } = await json("/api/crypto-payment", {
      method: "POST",
      body: JSON.stringify({
        planId: "pro",
        txHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        cryptoType: "ETH",
      }),
    });
    expect(res.status).toBe(401);
    expect(typeof body.error).toBe("string");
  });

  it("robots and sitemap respond", async () => {
    const robots = await fetch(`${BASE}/robots.txt`);
    expect(robots.status).toBe(200);
    const sitemap = await fetch(`${BASE}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
  });
});
