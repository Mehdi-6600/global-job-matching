import { describe, it, expect } from "vitest";
import { messageFromAiHttpError } from "@/lib/ai-client-errors";

const t = (_k: string, fb: string) => fb;

describe("messageFromAiHttpError", () => {
  it("maps 401", () => {
    expect(messageFromAiHttpError(401, {}, t)).toMatch(/sign in/i);
  });

  it("maps infra 503 / RATE_LIMIT_INFRA_ERROR", () => {
    expect(
      messageFromAiHttpError(503, { code: "RATE_LIMIT_INFRA_ERROR" }, t)
    ).toMatch(/unavailable/i);
  });

  it("maps 429 quota", () => {
    expect(
      messageFromAiHttpError(429, { code: "QUOTA_EXCEEDED" }, t)
    ).toMatch(/Too many/i);
  });

  it("prefers server error string for 400", () => {
    expect(
      messageFromAiHttpError(400, { error: "Invalid job title" }, t)
    ).toBe("Invalid job title");
  });

  it("falls back on empty 500", () => {
    expect(messageFromAiHttpError(500, {}, t)).toMatch(/went wrong/i);
  });
});
