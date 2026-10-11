import { describe, it, expect, vi, beforeEach } from "vitest";

const { dbTouched } = vi.hoisted(() => ({ dbTouched: vi.fn() }));

// Any database access from this route is a failure.
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        dbTouched();
        throw new Error("database must not be used by a disabled route");
      },
    },
  ),
}));

import * as route from "./route";

const BASE = "https://app.test/api/admin/backfill-categories";
const VARIANTS = [
  BASE,
  `${BASE}/`,
  `${BASE}?token=wrong-value`,
  `${BASE}/?token=wrong-value&dry=1`,
  `${BASE}?dry=0`,
];

const HANDLERS = {
  GET: route.GET,
  POST: route.POST,
  PUT: route.PUT,
  PATCH: route.PATCH,
  DELETE: route.DELETE,
  HEAD: route.HEAD,
  OPTIONS: route.OPTIONS,
} as const;

describe("disabled /api/admin/backfill-categories", () => {
  beforeEach(() => {
    dbTouched.mockClear();
  });

  for (const [method, handler] of Object.entries(HANDLERS)) {
    it(`${method} returns 404 for every URL variant without touching the database`, async () => {
      for (const url of VARIANTS) {
        const req = new Request(url, { method }) as never;
        const res = await (handler as (r: never) => Promise<Response>)(req);
        expect(res.status).toBe(404);
        const body = await res.text();
        expect(body).not.toMatch(/categor/i);
        expect(body).not.toMatch(/token/i);
      }
      expect(dbTouched).not.toHaveBeenCalled();
    });
  }
});
