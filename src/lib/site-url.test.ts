import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { absoluteUrl, getSiteUrl, truncateMeta } from "./site-url";

describe("site-url", () => {
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  const prevAuth = process.env.AUTH_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.AUTH_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = prevApp;
    process.env.NEXT_PUBLIC_SITE_URL = prevSite;
    process.env.AUTH_URL = prevAuth;
  });

  it("falls back to production default", () => {
    expect(getSiteUrl()).toBe("https://global-job-matching.vercel.app");
  });

  it("strips trailing slash from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("builds absolute paths", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(absoluteUrl("/jobs")).toBe("https://example.com/jobs");
    expect(absoluteUrl("jobs")).toBe("https://example.com/jobs");
    expect(absoluteUrl("https://other.test/x")).toBe("https://other.test/x");
  });

  it("truncates meta descriptions", () => {
    expect(truncateMeta("short")).toBe("short");
    expect(truncateMeta("<b>Hello</b> world")).toBe("Hello world");
    const long = "a".repeat(200);
    const out = truncateMeta(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
  });
});
