import { describe, it, expect } from "vitest";
import { parseListLimit } from "./pagination";

describe("parseListLimit", () => {
  it("uses default when missing", () => {
    expect(parseListLimit(null, { defaultLimit: 50, maxLimit: 100 })).toBe(50);
  });

  it("clamps above max", () => {
    expect(parseListLimit("9999", { defaultLimit: 50, maxLimit: 100 })).toBe(
      100
    );
  });

  it("clamps below min", () => {
    expect(parseListLimit("0", { defaultLimit: 50, maxLimit: 100, minLimit: 1 })).toBe(
      1
    );
  });

  it("parses valid number", () => {
    expect(parseListLimit("25", { defaultLimit: 50, maxLimit: 100 })).toBe(25);
  });

  it("falls back on garbage", () => {
    expect(parseListLimit("abc", { defaultLimit: 40, maxLimit: 100 })).toBe(40);
  });
});
