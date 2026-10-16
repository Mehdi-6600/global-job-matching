import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { classifyRoute, normalizeRoutePath } from "@/lib/route-access";

describe("normalizeRoutePath", () => {
  it("strips language prefixes and trailing slashes", () => {
    expect(normalizeRoutePath("/fa")).toBe("/");
    expect(normalizeRoutePath("/fa/")).toBe("/");
    expect(normalizeRoutePath("/de/pricing")).toBe("/pricing");
    expect(normalizeRoutePath("/jobs/")).toBe("/jobs");
    expect(normalizeRoutePath("/")).toBe("/");
  });

  it("does not strip unsupported locale-looking segments", () => {
    expect(normalizeRoutePath("/xx/jobs")).toBe("/xx/jobs");
  });
});

describe("classifyRoute — guest-visible public pages", () => {
  it.each([
    "/",
    "/fa",
    "/fa/",
    "/jobs",
    "/fa/jobs",
    "/ar/jobs/abc123",
    "/de/pricing",
    "/pricing",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/companies",
    "/companies/cmp1",
    "/categories/engineering",
    "/locations/berlin",
    "/blog",
    "/blog/some-post",
    "/search",
    "/career-risk/share/abc123",
    "/fr/career-risk/share/abc123",
  ])("%s is public", (url) => {
    expect(classifyRoute(url)).toBe("public");
  });
});

describe("classifyRoute — auth pages", () => {
  it.each(["/login", "/fa/login", "/register", "/es/register", "/forgot-password", "/reset-password", "/verify-email"])(
    "%s is auth",
    (url) => {
      expect(classifyRoute(url)).toBe("auth");
    },
  );
});

describe("classifyRoute — private routes stay protected", () => {
  it.each([
    "/dashboard",
    "/fa/dashboard",
    "/dashboard/admin",
    "/employer/post-job",
    "/admin",
    "/admin/users",
    "/settings",
    "/profile",
    "/company/profile",
    "/my-applications",
    "/saved-jobs",
    "/messages",
    "/notifications",
    "/payment",
    "/career-risk",
    "/resume-builder",
  ])("%s is private", (url) => {
    expect(classifyRoute(url)).toBe("private");
  });
});

describe("classifyRoute — unknown routes are not sent to login", () => {
  it.each([
    "/this-page-does-not-exist",
    "/fa/this-page-does-not-exist",
    "/dashboardx",
    "/companiesx",
  ])("%s is none (rendered as 404, not redirected)", (url) => {
    expect(classifyRoute(url)).toBe("none");
  });
});

describe("segment-aware matching", () => {
  it("does not let /companies match the /company private prefix", () => {
    expect(classifyRoute("/companies")).toBe("public");
    expect(classifyRoute("/company/profile")).toBe("private");
  });
});

/* ------------------------------------------------------------------ */
/* Coverage: every real page under src/app must be explicitly classified */
/* ------------------------------------------------------------------ */

function collectPageRoutes(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api") continue; // API routes handle their own auth
      if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
        out.push(...collectPageRoutes(full, prefix)); // route group: no URL segment
      } else {
        out.push(...collectPageRoutes(full, `${prefix}/${entry.name}`));
      }
    } else if (entry.name === "page.tsx") {
      out.push(prefix || "/");
    }
  }
  return out;
}

describe("route coverage", () => {
  const appDir = path.resolve(__dirname, "../app");

  it("classifies every page route (no page silently treated as unknown)", () => {
    const routes = collectPageRoutes(appDir);
    expect(routes.length).toBeGreaterThan(20);

    const unclassified = routes.filter((route) => {
      // Replace dynamic segments with a concrete sample value.
      const concrete = route.replace(/\[[^\]]+\]/g, "sample");
      return classifyRoute(concrete) === "none";
    });

    expect(unclassified).toEqual([]);
  });
});
