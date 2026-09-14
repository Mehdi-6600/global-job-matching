import { describe, it, expect } from "vitest";
import { messageFromAiHttpError } from "@/lib/ai-client-errors";

const t = (key: string, fallback: string) => fallback;

describe("messageFromAiHttpError", () => {
  it("maps 401", () => {
    expect(messageFromAiHttpError(401, {}, t)).toMatch(/sign in/i);
  });

  it("maps 503 and infra codes", () => {
    expect(
      messageFromAiHttpError(503, { code: "RATE_LIMIT_INFRA_ERROR" }, t)
    ).toMatch(/unavailable/i);
    expect(
      messageFromAiHttpError(200, { code: "QUOTA_INFRA_ERROR" }, t)
    ).toMatch(/unavailable/i);
  });

  it("maps 429 / quota", () => {
    expect(messageFromAiHttpError(429, {}, t)).toMatch(/too many/i);
    expect(
      messageFromAiHttpError(403, { code: "QUOTA_EXCEEDED" }, t)
    ).toMatch(/too many/i);
  });

  it("prefers server error string for 400", () => {
    expect(
      messageFromAiHttpError(400, { error: "Job title required" }, t)
    ).toBe("Job title required");
  });

  it("maps 500 fallback", () => {
    expect(messageFromAiHttpError(500, {}, t)).toMatch(/went wrong/i);
  });
});
