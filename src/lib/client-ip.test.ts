import { describe, it, expect } from "vitest";
import { getRequestIp } from "./client-ip";

function req(headers: Record<string, string>) {
  return new Request("http://localhost", { headers });
}

describe("getRequestIp", () => {
  it("prefers x-vercel-forwarded-for", () => {
    expect(
      getRequestIp(
        req({
          "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8",
          "x-forwarded-for": "9.9.9.9",
        })
      )
    ).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(getRequestIp(req({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });
});
