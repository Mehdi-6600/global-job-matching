import { describe, expect, it } from "vitest";
import { getRequestIp } from "@/lib/client-ip";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/api", { headers });
}

describe("getRequestIp", () => {
  it("prefers x-vercel-forwarded-for first hop", () => {
    const ip = getRequestIp(
      req({
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.1",
        "x-real-ip": "192.0.2.1",
      })
    );
    expect(ip).toBe("203.0.113.10");
  });

  it("uses x-real-ip when vercel header missing", () => {
    expect(
      getRequestIp(
        req({
          "x-real-ip": "192.0.2.55",
          "x-forwarded-for": "198.51.100.9",
        })
      )
    ).toBe("192.0.2.55");
  });

  it("uses first hop of x-forwarded-for as last resort", () => {
    expect(
      getRequestIp(req({ "x-forwarded-for": "198.51.100.2, 10.1.1.1" }))
    ).toBe("198.51.100.2");
  });

  it("returns fallback when headers missing", () => {
    expect(getRequestIp(req({}))).toBe("unknown");
    expect(getRequestIp(req({}), "0.0.0.0")).toBe("0.0.0.0");
  });

  it("rejects malformed / garbage values and falls through", () => {
    expect(
      getRequestIp(
        req({
          "x-vercel-forwarded-for": "not-an-ip",
          "x-real-ip": "also bad",
          "x-forwarded-for": "203.0.113.8",
        })
      )
    ).toBe("203.0.113.8");
  });

  it("trims whitespace on hops", () => {
    expect(
      getRequestIp(req({ "x-forwarded-for": "  203.0.113.20  , 10.0.0.1" }))
    ).toBe("203.0.113.20");
  });

  it("accepts plausible IPv6 shape", () => {
    expect(getRequestIp(req({ "x-real-ip": "2001:db8::1" }))).toBe(
      "2001:db8::1"
    );
  });

  it("rejects unknown/null tokens", () => {
    expect(
      getRequestIp(
        req({
          "x-real-ip": "unknown",
          "x-forwarded-for": "203.0.113.30",
        })
      )
    ).toBe("203.0.113.30");
  });
});
