import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

// The legacy backfill HTTP endpoint was removed (token-in-query-string write
// path). The CLI script scripts/backfill-categories.mjs remains the only way to
// run this backfill. This guard fails if the route is re-added.
describe("removed endpoints", () => {
  it("does not expose /api/admin/backfill-categories over HTTP", () => {
    const root = process.cwd();
    const routeDir = join(root, "src", "app", "api", "admin", "backfill-categories");
    expect(existsSync(join(routeDir, "route.ts"))).toBe(false);
    expect(existsSync(join(routeDir, "route.js"))).toBe(false);
  });

  it("keeps the CLI backfill script available", () => {
    expect(existsSync(join(process.cwd(), "scripts", "backfill-categories.mjs"))).toBe(true);
  });
});
