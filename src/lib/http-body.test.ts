import { describe, it, expect } from "vitest";
import { readJsonBody } from "./http";

describe("readJsonBody", () => {
  it("parses valid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonBody(req)).resolves.toEqual({ a: 1 });
  });

  it("returns null for invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonBody(req)).resolves.toBeNull();
  });
});
