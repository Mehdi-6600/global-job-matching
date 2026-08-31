import { describe, expect, it } from "vitest";
import { isAuthorizedBearerSecret } from "@/lib/api-auth";

describe("isAuthorizedBearerSecret", () => {
  const secret = "test-sync-secret-1234567890";

  it("accepts the exact bearer secret", () => {
    const request = new Request("https://example.com/api/jobs/sync", {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    expect(isAuthorizedBearerSecret(request, secret)).toBe(true);
  });

  it("rejects a missing authorization header", () => {
    const request = new Request("https://example.com/api/jobs/sync");

    expect(isAuthorizedBearerSecret(request, secret)).toBe(false);
  });

  it("rejects query-string style authentication", () => {
    const request = new Request(
      `https://example.com/api/jobs/sync?secret=${encodeURIComponent(secret)}`
    );

    expect(isAuthorizedBearerSecret(request, secret)).toBe(false);
  });

  it("rejects an incorrect secret", () => {
    const request = new Request("https://example.com/api/jobs/sync", {
      headers: {
        Authorization: "Bearer wrong-secret",
      },
    });

    expect(isAuthorizedBearerSecret(request, secret)).toBe(false);
  });

  it("rejects malformed authorization", () => {
    const request = new Request("https://example.com/api/jobs/sync", {
      headers: {
        Authorization: secret,
      },
    });

    expect(isAuthorizedBearerSecret(request, secret)).toBe(false);
  });

  it("rejects an empty bearer token", () => {
    const request = new Request("https://example.com/api/jobs/sync", {
      headers: {
        Authorization: "Bearer ",
      },
    });

    expect(isAuthorizedBearerSecret(request, secret)).toBe(false);
  });

  it("rejects an empty expected secret", () => {
    const request = new Request("https://example.com/api/jobs/sync", {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    expect(isAuthorizedBearerSecret(request, "")).toBe(false);
  });
});
